//  Match rules shared by the API routes, so the lobby card and the match
//  itself can never disagree about how long a game lasts.

//  Every match is 1 minute for now.
export const MATCH_DURATION_SECONDS = 60;

//  The starting capital a creator can pick.
export const ALLOWED_CAPITAL = [5000, 10000, 20000];
