"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Planner from "./Planner.jsx";

const PAPER = "#FBF8F1", INK = "#1C1A17", ACCENT = "#B5532A", LINE = "#E3DCCF", FAINT = "#8A8278";
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS = "'Inter', -apple-system, sans-serif";

export default function Page() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <Centered>Loading…</Centered>;
  }
  if (!session) {
    return <AuthScreen />;
  }
  return <Planner onSignOut={() => supabase.auth.signOut()} userEmail={session.user.email} />;
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, fontFamily: SANS, color: FAINT }}>
      {children}
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Check your email to confirm, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setMsg(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, fontFamily: SANS, padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "36px 32px", boxShadow: "0 12px 40px rgba(28,26,23,0.06)" }}>
        <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, color: INK, textAlign: "center", marginBottom: 4 }}>Momentum</div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: FAINT, textAlign: "center", marginBottom: 26 }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={inp} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
          onKeyDown={(e) => e.key === "Enter" && submit()} style={inp} />
        <button onClick={submit} disabled={busy} style={{ width: "100%", background: ACCENT, color: "#fff", border: "none", borderRadius: 9, padding: "12px", fontFamily: SANS, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 6 }}>
          {busy ? "…" : mode === "signup" ? "Sign up" : "Sign in"}
        </button>
        {msg && <div style={{ fontFamily: SANS, fontSize: 12, color: ACCENT, marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>{msg}</div>}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }}
            style={{ background: "none", border: "none", color: FAINT, fontFamily: SANS, fontSize: 12, cursor: "pointer" }}>
            {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = { width: "100%", border: `1px solid ${LINE}`, borderRadius: 9, padding: "11px 13px", fontFamily: SANS, fontSize: 14, color: INK, outline: "none", marginBottom: 12, boxSizing: "border-box" };
