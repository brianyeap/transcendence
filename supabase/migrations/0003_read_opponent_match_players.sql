-- ============================================================================
-- Migration 0003: let players read their opponent's match_players row
-- ----------------------------------------------------------------------------
-- THE PROBLEM
-- The only SELECT policies on match_players were "you can read your OWN row":
--
--     using (user_id = auth.uid())
--
-- So on the history page, asking for both players of a match only returned
-- one row. The opponent's final_capital / realized_pnl came back missing and
-- the page fell back to the starting capital ($10,000.00, $0.00) - even when
-- the opponent had actually won with $10,022.
--
-- THE FIX
-- Same rule we already use for trades and match_candles: if you played in
-- the match, you can read every match_players row of that match.
-- The matches SELECT policy does not look at match_players, so there is no
-- policy recursion.
-- ============================================================================

create policy "read match_players for my matches"
    on public.match_players
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.matches m
            where m.id = match_players.match_id
              and (m.player_one_user_id = auth.uid()
                   or m.player_two_user_id = auth.uid())
        )
    );
