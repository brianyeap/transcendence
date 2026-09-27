SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_status AS ENUM (
    'waiting',
    'countdown',
    'active',
    'completed'
);


--
-- Name: position_side; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.position_side AS ENUM (
    'long',
    'short',
    'flat'
);


--
-- Name: trade_side; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trade_side AS ENUM (
    'long',
    'short'
);


--
-- Name: accept_friend_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_friend_request(requester uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    update friends
    set status = 'accepted'
    where user_id = requester
      and friend_id = auth.uid()
      and status = 'pending';
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  default_username text;
begin
  -- Resolve username from metadata or fall back to the email prefix
  default_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    default_username
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(excluded.username, profiles.username);

  return new;
end;
$$;


--
-- Name: ping_online(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ping_online() RETURNS void
    LANGUAGE sql
    AS $$
  update profiles set last_seen_at = now() where id = auth.uid();
$$;


--
-- Name: remove_friend(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_friend(other uuid) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
    delete from friends
    where (user_id = auth.uid() and friend_id = other)
       or (user_id = other and friend_id = auth.uid());
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: friends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friends (
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT friends_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone,
    avatar_url text
);


--
-- Name: friends_with_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.friends_with_status WITH (security_invoker='true') AS
 SELECT p.id,
    p.username,
    p.avatar_url,
    (EXTRACT(epoch FROM (now() - p.last_seen_at)))::integer AS seconds_since_seen,
    f.status,
    (f.user_id = auth.uid()) AS sent_by_me
   FROM (public.friends f
     JOIN public.profiles p ON ((p.id =
        CASE
            WHEN (f.user_id = auth.uid()) THEN f.friend_id
            ELSE f.user_id
        END)));


--
-- Name: match_candles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_candles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    sequence integer NOT NULL,
    open_time timestamp with time zone NOT NULL,
    open numeric NOT NULL,
    high numeric NOT NULL,
    low numeric NOT NULL,
    close numeric NOT NULL
);


--
-- Name: match_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    user_id uuid NOT NULL,
    available_balance numeric NOT NULL,
    realized_pnl numeric NOT NULL,
    current_side public.position_side NOT NULL,
    position_notional_usdt numeric NOT NULL,
    average_entry_price numeric,
    final_capital numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    result text,
    CONSTRAINT match_players_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text, 'draw'::text])))
);


--
-- Name: COLUMN match_players.result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.match_players.result IS 'How the match ended for this player: win, loss or draw. Written by the engine at settlement.';


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_one_user_id uuid NOT NULL,
    player_two_user_id uuid,
    status public.match_status NOT NULL,
    symbol text DEFAULT 'BTCUSDT'::text NOT NULL,
    starting_capital numeric NOT NULL,
    countdown_starts_at timestamp with time zone,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    final_price numeric,
    winner_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_seconds integer,
    name text
);


--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    user_id uuid NOT NULL,
    side public.trade_side NOT NULL,
    amount_usdt numeric NOT NULL,
    execution_price numeric NOT NULL,
    candle_sequence integer,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    realized_pnl numeric,
    resulting_side public.position_side,
    resulting_notional numeric
);


--
-- Name: friends friends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_pkey PRIMARY KEY (user_id, friend_id);


--
-- Name: match_candles match_candles_match_id_sequence_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_candles
    ADD CONSTRAINT match_candles_match_id_sequence_key UNIQUE (match_id, sequence);


--
-- Name: match_candles match_candles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_candles
    ADD CONSTRAINT match_candles_pkey PRIMARY KEY (id);


--
-- Name: match_players match_players_match_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_user_id_key UNIQUE (match_id, user_id);


--
-- Name: match_players match_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: friends_one_row_per_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX friends_one_row_per_pair ON public.friends USING btree (LEAST(user_id, friend_id), GREATEST(user_id, friend_id));


--
-- Name: match_candles_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX match_candles_match_idx ON public.match_candles USING btree (match_id);


--
-- Name: match_players_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX match_players_match_idx ON public.match_players USING btree (match_id);


--
-- Name: trades_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trades_match_idx ON public.trades USING btree (match_id);


--
-- Name: trades_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trades_user_idx ON public.trades USING btree (user_id);


--
-- Name: friends friends_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: friends friends_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: match_candles match_candles_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_candles
    ADD CONSTRAINT match_candles_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);


--
-- Name: match_players match_players_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);


--
-- Name: match_players match_players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: matches matches_player_one_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player_one_user_id_fkey FOREIGN KEY (player_one_user_id) REFERENCES auth.users(id);


--
-- Name: matches matches_player_two_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player_two_user_id_fkey FOREIGN KEY (player_two_user_id) REFERENCES auth.users(id);


--
-- Name: matches matches_winner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_user_id_fkey FOREIGN KEY (winner_user_id) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: trades trades_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);


--
-- Name: trades trades_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: matches Authenticated users can read completed matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read completed matches" ON public.matches FOR SELECT TO authenticated USING ((status = 'completed'::public.match_status));


--
-- Name: matches Players can delete their own waiting matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can delete their own waiting matches" ON public.matches FOR DELETE TO authenticated USING (((player_one_user_id = auth.uid()) AND (status = 'waiting'::public.match_status)));


--
-- Name: matches Players can view their matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can view their matches" ON public.matches FOR SELECT TO authenticated USING (((player_one_user_id = auth.uid()) OR (player_two_user_id = auth.uid())));


--
-- Name: matches Users can create their own waiting matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own waiting matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (((player_one_user_id = auth.uid()) AND (player_two_user_id IS NULL) AND (status = 'waiting'::public.match_status)));


--
-- Name: match_candles authenticated_users_can_read_match_candles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_can_read_match_candles ON public.match_candles FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: friends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: matches join open room as player two; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "join open room as player two" ON public.matches FOR UPDATE TO authenticated USING (((status = 'waiting'::public.match_status) AND (player_two_user_id IS NULL) AND (player_one_user_id <> auth.uid()))) WITH CHECK ((player_two_user_id = auth.uid()));


--
-- Name: match_candles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_candles ENABLE ROW LEVEL SECURITY;

--
-- Name: match_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles read all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: match_candles read candles for my matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read candles for my matches" ON public.match_candles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_candles.match_id) AND ((m.player_one_user_id = auth.uid()) OR (m.player_two_user_id = auth.uid()))))));


--
-- Name: friends read friendships I am in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read friendships I am in" ON public.friends FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (friend_id = auth.uid())));


--
-- Name: match_players read match_players for my matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read match_players for my matches" ON public.match_players FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_players.match_id) AND ((m.player_one_user_id = auth.uid()) OR (m.player_two_user_id = auth.uid()))))));


--
-- Name: match_players read own match_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read own match_players" ON public.match_players FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: trades read trades for my matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read trades for my matches" ON public.trades FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = trades.match_id) AND ((m.player_one_user_id = auth.uid()) OR (m.player_two_user_id = auth.uid()))))));


--
-- Name: matches read_waiting_matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_waiting_matches ON public.matches FOR SELECT TO authenticated USING ((status = 'waiting'::public.match_status));


--
-- Name: friends remove friendships I am in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "remove friendships I am in" ON public.friends FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR (friend_id = auth.uid())));


--
-- Name: friends send friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "send friend requests" ON public.friends FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (friend_id <> auth.uid()) AND (status = 'pending'::text)));


--
-- Name: trades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: profiles users_can_insert_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_can_insert_own_profile ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: match_players users_can_read_own_match_player; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_can_read_own_match_player ON public.match_players FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles users_can_read_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_can_read_own_profile ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: trades users_can_read_own_trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_can_read_own_trades ON public.trades FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles users_can_update_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_can_update_own_profile ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- PostgreSQL database dump complete
--


