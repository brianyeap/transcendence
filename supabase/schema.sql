-- ============================================================================
-- supabase/schema.sql: snapshot of the LIVE database (public schema only)
-- ----------------------------------------------------------------------------
-- Made with pg_dump on 2026-09-28, after migrations 0000-0014 were applied.
-- It is for reading, not for running: to build a database, run the files in
-- supabase/migrations/ in order.
--
-- Not shown here because pg_dump --schema=public leaves them out:
--   - the on_auth_user_created trigger (it lives on auth.users, see 0006)
--   - the supabase_realtime publication, which includes public.matches (0011)
-- ============================================================================
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
-- Name: enforce_one_open_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_one_open_match() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
    new_player uuid;
begin
    -- A finished match never blocks anything.
    if new.status = 'completed' then
        return new;
    end if;

    -- Which player is this write adding?
    --   INSERT: the creator (player one).
    --   UPDATE: player two, but only when it was just filled in (a join).
    if tg_op = 'INSERT' then
        new_player := new.player_one_user_id;
    elsif new.player_two_user_id is distinct from old.player_two_user_id then
        new_player := new.player_two_user_id;
    end if;

    if new_player is null then
        return new;  -- nobody new in this match: nothing to check
    end if;

    -- 1. One request at a time per player. The lock is released by itself
    --    when the transaction ends. hashtext() turns the text into the number
    --    the lock function needs.
    perform pg_advisory_xact_lock(hashtext('one_open_match:' || new_player::text));

    -- 2 + 3. Already in another open match? Refuse.
    if exists (
        select 1
        from public.matches m
        where m.id <> new.id
          and m.status <> 'completed'
          and (m.player_one_user_id = new_player or m.player_two_user_id = new_player)
    ) then
        raise exception 'player % is already in an open match', new_player
            using errcode = '23505';
    end if;

    return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  typed_username text;  -- the name the player typed on the register page
  clean_username text;  -- the name we will actually save
begin
  typed_username := btrim(new.raw_user_meta_data->>'username');

  if typed_username is not null then
    -- ---- 1. Email signup: the player chose a name, so it must be valid ----
    if typed_username !~ '^[A-Za-z0-9_ -]{3,20}$' then
      -- errcode 23514 = check_violation. Raising here cancels the insert into
      -- auth.users, so the account is never created.
      raise exception 'Invalid username: must be 3-20 characters of A-Z a-z 0-9 _ - or space'
        using errcode = '23514';
    end if;

    clean_username := typed_username;
  else
    -- ---- 2. Google / no name: build a valid name ourselves ---------------
    clean_username := coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      ''
    );

    -- Remove every character that is not allowed.
    clean_username := regexp_replace(clean_username, '[^A-Za-z0-9_ -]', '', 'g');

    -- Cut to 20 characters, then trim spaces from both ends (trimming after the
    -- cut so the name cannot end with a space).
    clean_username := btrim(left(btrim(clean_username), 20));

    -- Too short after cleaning (e.g. a name written only in Chinese).
    if length(clean_username) < 3 then
      clean_username := 'player';
    end if;

    -- Name already used by someone else? Add part of the user id to make it
    -- unique: 13 chars of name + "_" + 6 chars of id = 20 chars max.
    if exists (
      select 1 from public.profiles
      where username = clean_username and id <> new.id
    ) then
      clean_username := rtrim(left(clean_username, 13))
        || '_' || left(replace(new.id::text, '-', ''), 6);
    end if;
  end if;

  insert into public.profiles (id, username)
  values (new.id, clean_username)
  on conflict (id) do update set
    username = coalesce(excluded.username, profiles.username);

  -- Unchanged from before: every new user gets a presence row.
  insert into public.user_presence (user_id, last_seen_at)
  values (new.id, now())
  on conflict (user_id) do nothing;

  return new;
end;
$_$;


--
-- Name: ping_online(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ping_online() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  INSERT INTO public.user_presence (user_id, last_seen_at)
  VALUES (auth.uid(), now())
  ON CONFLICT (user_id) DO UPDATE SET last_seen_at = now();
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
    avatar_url text
);


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    user_id uuid NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now()
);


--
-- Name: friends_with_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.friends_with_status WITH (security_invoker='true') AS
 SELECT p.id,
    p.username,
    p.avatar_url,
    (EXTRACT(epoch FROM (now() - up.last_seen_at)))::integer AS seconds_since_seen,
    f.status,
    (f.user_id = auth.uid()) AS sent_by_me
   FROM ((public.friends f
     JOIN public.profiles p ON ((p.id =
        CASE
            WHEN (f.user_id = auth.uid()) THEN f.friend_id
            ELSE f.user_id
        END)))
     LEFT JOIN public.user_presence up ON ((up.user_id = p.id)));


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
    symbol text DEFAULT 'BTC/USDT'::text NOT NULL,
    starting_capital numeric NOT NULL,
    countdown_starts_at timestamp with time zone,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    final_price numeric,
    winner_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_seconds integer,
    name text,
    invited_user_id uuid,
    CONSTRAINT matches_duration_seconds_check CHECK (((duration_seconds IS NULL) OR (duration_seconds = ANY (ARRAY[30, 60, 90])))),
    CONSTRAINT matches_name_check CHECK (((name IS NULL) OR (((char_length(name) >= 1) AND (char_length(name) <= 40)) AND (name ~ '^[A-Za-z0-9 _''!?.-]+$'::text)))),
    CONSTRAINT matches_starting_capital_check CHECK ((starting_capital = ANY (ARRAY[(5000)::numeric, (10000)::numeric, (20000)::numeric]))),
    CONSTRAINT matches_symbol_check CHECK ((symbol = ANY (ARRAY['BTC/USDT'::text, 'ETH/USDT'::text, 'SOL/USDT'::text])))
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
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_format_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_username_format_check CHECK ((username ~ '^[A-Za-z0-9_ -]{3,20}$'::text)) NOT VALID;


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
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (user_id);


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
-- Name: matches one_open_match_per_player; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER one_open_match_per_player BEFORE INSERT OR UPDATE OF player_two_user_id ON public.matches FOR EACH ROW EXECUTE FUNCTION public.enforce_one_open_match();


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
-- Name: matches matches_invited_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: user_presence user_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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

CREATE POLICY "Users can create their own waiting matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (((player_one_user_id = auth.uid()) AND (player_two_user_id IS NULL) AND (status = 'waiting'::public.match_status) AND ((invited_user_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.friends f
  WHERE ((f.status = 'accepted'::text) AND (((f.user_id = auth.uid()) AND (f.friend_id = matches.invited_user_id)) OR ((f.user_id = matches.invited_user_id) AND (f.friend_id = auth.uid())))))))));


--
-- Name: friends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


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

CREATE POLICY "read candles for my matches" ON public.match_candles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
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
-- Name: user_presence read presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read presence" ON public.user_presence FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.friends f
  WHERE ((f.status = 'accepted'::text) AND (((f.user_id = auth.uid()) AND (f.friend_id = user_presence.user_id)) OR ((f.friend_id = auth.uid()) AND (f.user_id = user_presence.user_id))))))));


--
-- Name: trades read trades for my matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read trades for my matches" ON public.trades FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = trades.match_id) AND ((m.player_one_user_id = auth.uid()) OR (m.player_two_user_id = auth.uid()))))));


--
-- Name: matches read_waiting_matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_waiting_matches ON public.matches FOR SELECT TO authenticated USING (((status = 'waiting'::public.match_status) AND ((invited_user_id IS NULL) OR (invited_user_id = auth.uid()))));


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
-- Name: user_presence update own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "update own presence" ON public.user_presence TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

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


