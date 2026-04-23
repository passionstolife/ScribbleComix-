import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { RoleBadge } from "../components/Badges";
import { Shield, UserCog, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["founder", "co_founder", "promoter", "ultimate", "pro", "free"];

const Admin = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [promoteEmail, setPromoteEmail] = useState("");
    const [promoteRole, setPromoteRole] = useState("promoter");
    const [forbidden, setForbidden] = useState(false);
    const navigate = useNavigate();

    const load = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/admin/users");
            setUsers(data.users);
        } catch (e) {
            if (e?.response?.status === 403) setForbidden(true);
            else toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const promote = async () => {
        if (!promoteEmail.trim()) return;
        try {
            await api.post("/admin/promote", { email: promoteEmail.trim(), role: promoteRole });
            toast.success(`Promoted ${promoteEmail} to ${promoteRole}`);
            setPromoteEmail("");
            load();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Promotion failed");
        }
    };

    if (forbidden) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="max-w-2xl mx-auto px-6 py-16 text-center">
                    <div className="ink-card p-10">
                        <Shield size={48} className="mx-auto" />
                        <h1 className="font-heading text-5xl mt-4">Founders only.</h1>
                        <p className="mt-3 font-body text-ink/70">This dashboard is for ScribbleComix founders and co-founders.</p>
                        <button onClick={() => navigate('/dashboard')} className="mt-6 btn-yellow">Back to shelf</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" data-testid="admin-page">
            <Navbar />
            <main className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                    <div>
                        <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">Founders dashboard</div>
                        <h1 className="font-heading text-6xl leading-none mt-1 flex items-center gap-3"><UserCog size={48}/> Admin</h1>
                    </div>
                </div>

                {/* Promote user */}
                <div className="ink-card p-6 mb-8">
                    <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Promote a user</div>
                    <p className="font-body text-sm text-ink/70 mt-1">Find them by the email they signed in with (they must have logged in once).</p>
                    <div className="mt-3 flex gap-2 flex-wrap">
                        <input
                            data-testid="promote-email"
                            value={promoteEmail}
                            onChange={(e) => setPromoteEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="flex-1 min-w-[240px] border-2 border-ink bg-white p-2 font-body text-sm"
                        />
                        <select
                            data-testid="promote-role"
                            value={promoteRole}
                            onChange={(e) => setPromoteRole(e.target.value)}
                            className="border-2 border-ink bg-white p-2 font-display font-bold text-sm uppercase"
                        >
                            {["promoter", "co_founder", "ultimate", "pro", "free"].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button data-testid="promote-btn" onClick={promote} className="btn-pink inline-flex items-center gap-2">
                            <ArrowUpRight size={16} strokeWidth={2.5}/> Promote
                        </button>
                    </div>
                </div>

                {/* Users list */}
                <h2 className="font-heading text-3xl mb-3">All users ({users.length})</h2>
                {loading ? (
                    <div className="font-heading text-3xl">Loading…</div>
                ) : (
                    <div className="ink-card overflow-x-auto">
                        <table className="w-full text-sm font-body">
                            <thead className="border-b-2 border-ink">
                                <tr>
                                    <th className="text-left p-3 font-display uppercase text-xs tracking-wider">User</th>
                                    <th className="text-left p-3 font-display uppercase text-xs tracking-wider">Role</th>
                                    <th className="text-left p-3 font-display uppercase text-xs tracking-wider">Tier</th>
                                    <th className="text-left p-3 font-display uppercase text-xs tracking-wider">XP/Lvl</th>
                                    <th className="text-left p-3 font-display uppercase text-xs tracking-wider">Credits</th>
                                    <th className="text-left p-3 font-display uppercase text-xs tracking-wider">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.user_id} data-testid={`user-${u.user_id}`} className="border-b border-ink/10">
                                        <td className="p-3"><div className="font-bold">{u.name}</div><div className="text-xs text-ink/60">{u.email}</div></td>
                                        <td className="p-3"><RoleBadge role={u.role || "free"} size={28} showLabel /></td>
                                        <td className="p-3 uppercase font-bold text-xs">{u.tier}</td>
                                        <td className="p-3">{u.xp || 0} · L{u.level || 1}</td>
                                        <td className="p-3">{u.credits}</td>
                                        <td className="p-3 text-xs text-ink/60">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Admin;
