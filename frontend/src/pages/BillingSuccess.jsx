import React, { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MAX_ATTEMPTS = 10;
const INTERVAL_MS = 2000;

const BillingSuccess = () => {
    const [sp] = useSearchParams();
    const navigate = useNavigate();
    const { fetchBilling } = useAuth();
    const sessionId = sp.get("session_id");
    const [phase, setPhase] = useState("checking"); // checking | paid | expired | error
    const [info, setInfo] = useState(null);
    const attempts = useRef(0);

    useEffect(() => {
        if (!sessionId) { setPhase("error"); return; }
        let cancelled = false;

        const poll = async () => {
            if (cancelled) return;
            try {
                const { data } = await api.get(`/billing/status/${sessionId}`);
                setInfo(data);
                if (data.payment_status === "paid") {
                    setPhase("paid");
                    fetchBilling && fetchBilling();  // refresh Navbar credits/tier chip
                    return;
                }
                if (data.status === "expired") { setPhase("expired"); return; }
            } catch (e) {
                if (attempts.current >= MAX_ATTEMPTS) { setPhase("error"); return; }
            }
            attempts.current += 1;
            if (attempts.current >= MAX_ATTEMPTS) { setPhase("error"); return; }
            setTimeout(poll, INTERVAL_MS);
        };
        poll();
        return () => { cancelled = true; };
    }, [sessionId, fetchBilling]);

    return (
        <div className="min-h-screen" data-testid="billing-success-page">
            <Navbar />
            <main className="max-w-2xl mx-auto px-6 py-16">
                <div className="ink-card p-10 text-center relative tape">
                    {phase === "checking" && (
                        <>
                            <Loader2 className="animate-spin mx-auto" size={48} />
                            <h1 className="font-heading text-5xl mt-4">Inking the receipt…</h1>
                            <p className="font-body text-ink/70 mt-2">Confirming your payment with Stripe.</p>
                        </>
                    )}
                    {phase === "paid" && (
                        <>
                            <CheckCircle2 className="mx-auto text-green-600" size={60} strokeWidth={2.5} />
                            <h1 className="font-heading text-6xl mt-4" data-testid="success-title">Boom! You're topped up.</h1>
                            <p className="font-body text-ink/80 mt-2">Thanks for supporting ScribbleComix.</p>
                            {info && (
                                <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                                    <span className="border-2 border-ink px-3 py-1 font-display font-bold text-sm bg-highlight" data-testid="success-credits">Credits: {info.tier === "ultimate" ? "∞" : info.credits}</span>
                                    <span className="border-2 border-ink px-3 py-1 font-display font-bold text-sm uppercase bg-white" data-testid="success-tier">{info.tier}</span>
                                </div>
                            )}
                            <div className="mt-8 flex justify-center gap-3">
                                <button data-testid="success-create-btn" onClick={() => navigate('/create')} className="btn-pink">Start drawing</button>
                                <button data-testid="success-dashboard-btn" onClick={() => navigate('/dashboard')} className="btn-ink">My comics</button>
                            </div>
                        </>
                    )}
                    {phase === "expired" && (
                        <>
                            <AlertCircle className="mx-auto text-hotpink" size={60} strokeWidth={2.5} />
                            <h1 className="font-heading text-5xl mt-4">Session expired</h1>
                            <p className="font-body text-ink/70 mt-2">No charge was made. Try again?</p>
                            <button onClick={() => navigate('/billing')} className="mt-6 btn-yellow">Back to billing</button>
                        </>
                    )}
                    {phase === "error" && (
                        <>
                            <XCircle className="mx-auto text-hotpink" size={60} strokeWidth={2.5} />
                            <h1 className="font-heading text-5xl mt-4">Couldn't confirm payment</h1>
                            <p className="font-body text-ink/70 mt-2">If you were charged, it'll land shortly. Refresh or contact us.</p>
                            <button onClick={() => navigate('/billing')} className="mt-6 btn-ink">Back to billing</button>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BillingSuccess;
