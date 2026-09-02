


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."match_status" AS ENUM (
    'waiting',
    'countdown',
    'active',
    'completed'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."position_side" AS ENUM (
    'long',
    'short',
    'flat'
);


ALTER TYPE "public"."position_side" OWNER TO "postgres";


CREATE TYPE "public"."trade_side" AS ENUM (
    'long',
    'short'
);


ALTER TYPE "public"."trade_side" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ping_online"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update profiles set last_seen_at = now() where id = auth.uid();
$$;


ALTER FUNCTION "public"."ping_online"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."friends" (
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."friends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."friends_with_status" WITH ("security_invoker"='true') AS
 SELECT "f"."friend_id" AS "id",
    "p"."username",
    (EXTRACT(epoch FROM ("now"() - "p"."last_seen_at")))::integer AS "seconds_since_seen"
   FROM ("public"."friends" "f"
     JOIN "public"."profiles" "p" ON (("p"."id" = "f"."friend_id")));


ALTER VIEW "public"."friends_with_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_candles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "sequence" integer NOT NULL,
    "open_time" timestamp with time zone NOT NULL,
    "open" numeric NOT NULL,
    "high" numeric NOT NULL,
    "low" numeric NOT NULL,
    "close" numeric NOT NULL
);


ALTER TABLE "public"."match_candles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "available_balance" numeric NOT NULL,
    "realized_pnl" numeric NOT NULL,
    "current_side" "public"."position_side" NOT NULL,
    "position_notional_usdt" numeric NOT NULL,
    "average_entry_price" numeric,
    "final_capital" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "result" "text",
    CONSTRAINT "match_players_result_check" CHECK (("result" = ANY (ARRAY['win'::"text", 'loss'::"text", 'draw'::"text"])))
);


ALTER TABLE "public"."match_players" OWNER TO "postgres";


COMMENT ON COLUMN "public"."match_players"."result" IS 'How the match ended for this player: win, loss or draw. Written by the engine at settlement.';



CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_one_user_id" "uuid" NOT NULL,
    "player_two_user_id" "uuid",
    "status" "public"."match_status" NOT NULL,
    "symbol" "text" DEFAULT 'BTCUSDT'::"text" NOT NULL,
    "starting_capital" numeric NOT NULL,
    "countdown_starts_at" timestamp with time zone,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "final_price" numeric,
    "winner_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_seconds" integer,
    "name" "text"
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_profiles" WITH ("security_invoker"='false') AS
 SELECT "id",
    "username"
   FROM "public"."profiles";


ALTER VIEW "public"."public_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "side" "public"."trade_side" NOT NULL,
    "amount_usdt" numeric NOT NULL,
    "execution_price" numeric NOT NULL,
    "candle_sequence" integer,
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trades" OWNER TO "postgres";


ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_pkey" PRIMARY KEY ("user_id", "friend_id");



ALTER TABLE ONLY "public"."match_candles"
    ADD CONSTRAINT "match_candles_match_id_sequence_key" UNIQUE ("match_id", "sequence");



ALTER TABLE ONLY "public"."match_candles"
    ADD CONSTRAINT "match_candles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_match_id_user_id_key" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_pkey" PRIMARY KEY ("id");



CREATE INDEX "match_candles_match_idx" ON "public"."match_candles" USING "btree" ("match_id");



CREATE INDEX "match_players_match_idx" ON "public"."match_players" USING "btree" ("match_id");



CREATE INDEX "trades_match_idx" ON "public"."trades" USING "btree" ("match_id");



CREATE INDEX "trades_user_idx" ON "public"."trades" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_candles"
    ADD CONSTRAINT "match_candles_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player_one_user_id_fkey" FOREIGN KEY ("player_one_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player_two_user_id_fkey" FOREIGN KEY ("player_two_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Players can delete their own waiting matches" ON "public"."matches" FOR DELETE TO "authenticated" USING ((("player_one_user_id" = "auth"."uid"()) AND ("status" = 'waiting'::"public"."match_status")));



CREATE POLICY "Players can view their matches" ON "public"."matches" FOR SELECT TO "authenticated" USING ((("player_one_user_id" = "auth"."uid"()) OR ("player_two_user_id" = "auth"."uid"())));



CREATE POLICY "Users can create their own waiting matches" ON "public"."matches" FOR INSERT TO "authenticated" WITH CHECK ((("player_one_user_id" = "auth"."uid"()) AND ("player_two_user_id" IS NULL) AND ("status" = 'waiting'::"public"."match_status")));



CREATE POLICY "add own friends" ON "public"."friends" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("friend_id" <> "auth"."uid"())));



CREATE POLICY "authenticated_users_can_read_match_candles" ON "public"."match_candles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "join open room as player two" ON "public"."matches" FOR UPDATE TO "authenticated" USING ((("status" = 'waiting'::"public"."match_status") AND ("player_two_user_id" IS NULL) AND ("player_one_user_id" <> "auth"."uid"()))) WITH CHECK (("player_two_user_id" = "auth"."uid"()));



ALTER TABLE "public"."match_candles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read candles for my matches" ON "public"."match_candles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_candles"."match_id") AND (("m"."player_one_user_id" = "auth"."uid"()) OR ("m"."player_two_user_id" = "auth"."uid"()))))));



CREATE POLICY "read own friends" ON "public"."friends" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "read own match_players" ON "public"."match_players" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "read trades for my matches" ON "public"."trades" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "trades"."match_id") AND (("m"."player_one_user_id" = "auth"."uid"()) OR ("m"."player_two_user_id" = "auth"."uid"()))))));



CREATE POLICY "read_waiting_matches" ON "public"."matches" FOR SELECT TO "authenticated" USING (("status" = 'waiting'::"public"."match_status"));



ALTER TABLE "public"."trades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_can_insert_own_profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_can_read_own_match_player" ON "public"."match_players" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_read_own_profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_can_read_own_trades" ON "public"."trades" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."ping_online"() TO "anon";
GRANT ALL ON FUNCTION "public"."ping_online"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ping_online"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."friends" TO "anon";
GRANT ALL ON TABLE "public"."friends" TO "authenticated";
GRANT ALL ON TABLE "public"."friends" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."friends_with_status" TO "anon";
GRANT ALL ON TABLE "public"."friends_with_status" TO "authenticated";
GRANT ALL ON TABLE "public"."friends_with_status" TO "service_role";



GRANT ALL ON TABLE "public"."match_candles" TO "anon";
GRANT ALL ON TABLE "public"."match_candles" TO "authenticated";
GRANT ALL ON TABLE "public"."match_candles" TO "service_role";



GRANT ALL ON TABLE "public"."match_players" TO "anon";
GRANT ALL ON TABLE "public"."match_players" TO "authenticated";
GRANT ALL ON TABLE "public"."match_players" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."public_profiles" TO "anon";
GRANT ALL ON TABLE "public"."public_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."public_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."trades" TO "anon";
GRANT ALL ON TABLE "public"."trades" TO "authenticated";
GRANT ALL ON TABLE "public"."trades" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































