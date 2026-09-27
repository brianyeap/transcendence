# Authentication Flow Diagrams

## 1. Email/Password Sign‑In (No 2FA – AAL1 Session)

```mermaid
sequenceDiagram
    participant Browser as Browser/Client
    participant Next as Next.js Server
    participant Supabase as Supabase Auth
    Browser->>Next: POST /api/auth/login (email, password)
    Next->>Supabase: signInWithPassword(email, password)
    Supabase-->>Next: JWT Access Token, Refresh Token
    Next->>Browser: Set HTTP‑only cookie (supabase-auth-token)
    Note right of Browser: AAL1 session established
```

The flow issues a standard AAL1 session using email/password credentials without additional verification.

---

## 2. Email/Password Sign‑In (With 2FA – Upgrade to AAL2)

```mermaid
sequenceDiagram
    participant Browser as Browser/Client
    participant Next as Next.js Server
    participant Supabase as Supabase Auth
    Browser->>Next: POST /api/auth/login (email, password)
    Next->>Supabase: signInWithPassword(email, password)
    Supabase-->>Next: JWT (AAL1) + mfa_challenge_id
    Next->>Browser: Set HTTP‑only cookie (AAL1 token)
    Next->>Browser: Redirect to /mfa?challenge_id=...
    Browser->>Next: POST /api/auth/mfa (challenge_id, OTP)
    Next->>Supabase: verifyMFA(challenge_id, OTP)
    Supabase-->>Next: New JWT (AAL2) + Refresh Token
    Next->>Browser: Replace cookie with AAL2 token
    Note right of Browser: Session upgraded to AAL2
```

After initial credential verification, the user completes an MFA challenge, resulting in an upgraded AAL2 session.

---

## 3. Google OAuth Sign‑In (No 2FA – AAL1 Session)

```mermaid
sequenceDiagram
    participant Browser as Browser/Client
    participant Next as Next.js Server
    participant Google as Google OAuth Server
    participant Supabase as Supabase Auth
    Browser->>Next: GET /api/auth/google (initiate OAuth)
    Next->>Browser: Redirect to Google (auth_code_url)
    Browser->>Google: User authenticates & consents
    Google->>Browser: Redirect back with auth_code
    Browser->>Next: GET /api/auth/google/callback?code=auth_code
    Next->>Google: POST /token (code → access_token)
    Google-->>Next: Access Token + ID Token
    Next->>Supabase: signInWithOAuth(ID Token)
    Supabase-->>Next: JWT (AAL1) + Refresh Token
    Next->>Browser: Set HTTP‑only cookie (AAL1 token)
    Note right of Browser: Session established at AAL1
```

The Next.js callback exchanges the Google authorization code for tokens and creates an AAL1 Supabase session.

---

## 4. Google OAuth Sign‑In (With 2FA – Upgrade to AAL2)

```mermaid
sequenceDiagram
    participant Browser as Browser/Client
    participant Next as Next.js Server
    participant Google as Google OAuth Server
    participant Supabase as Supabase Auth
    Browser->>Next: GET /api/auth/google (start OAuth)
    Next->>Browser: Redirect to Google
    Browser->>Google: Authenticate & consent
    Google->>Browser: Redirect with auth_code
    Browser->>Next: GET /api/auth/google/callback?code=auth_code
    Next->>Google: POST /token (code → tokens)
    Google-->>Next: Access Token + ID Token
    Next->>Supabase: signInWithOAuth(ID Token)
    Supabase-->>Next: JWT (AAL1) + mfa_challenge_id
    Next->>Browser: Set HTTP‑only cookie (AAL1 token)
    Next->>Browser: Redirect to /mfa?challenge_id=...
    Browser->>Next: POST /api/auth/mfa (challenge_id, OTP)
    Next->>Supabase: verifyMFA(challenge_id, OTP)
    Supabase-->>Next: New JWT (AAL2) + Refresh Token
    Next->>Browser: Replace cookie with AAL2 token
    Note right of Browser: Session upgraded to AAL2 after OAuth login
```

When the OAuth‑generated session is AAL1 but the user requires MFA, the flow redirects to an MFA step and upgrades to an AAL2 session.
