"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Copy, Crown, Link2, MailPlus, RotateCw, Trash2, UserPlus, Users } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import SkeletonLoading from "@/components/ui/skeleton-loading";

type OrganizationListItem = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  tier: string;
  seatLimit: number | null;
  billingEmail: string | null;
  currentRole: string;
  canAdminister: boolean;
  invitations: Array<{ id: string }>;
  _count: {
    members: number;
    classes: number;
    assignments: number;
  };
};

type OrganizationMember = {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: {
    email: string;
    name: string | null;
    username: string | null;
  };
};

type OrganizationInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type OrganizationDetail = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  tier: string;
  currentRole: string;
  seatLimit: number | null;
  billingEmail: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  canTransferOwnership: boolean;
  ownerUser: {
    email: string;
    name: string | null;
    username: string | null;
  };
  canAdminister: boolean;
  subscriptions: Array<{
    id: string;
    provider: string | null;
    plan: string;
    status: string;
    seatCount: number | null;
    billingEmail: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    providerSubscriptionId: string | null;
    createdAt: string;
    updatedAt: string;
    billingUser: {
      id: string;
      email: string;
      name: string | null;
      username: string | null;
    } | null;
  }>;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  _count: {
    classes: number;
    assignments: number;
    quizzes: number;
  };
};

const INITIAL_CREATE_FORM = { name: "", billingEmail: "", seatLimit: "" };
const INITIAL_INVITE_FORM = { email: "", role: "teacher" };
const INITIAL_SETTINGS_FORM = {
  name: "",
  billingEmail: "",
  seatLimit: "",
  status: "active",
  tier: "organization",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not set"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

async function readJsonResponse(res: Response) {
  return res.json().catch(() => ({}));
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the legacy copy path. Some browsers block async clipboard after awaits.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [inviteForm, setInviteForm] = useState(INITIAL_INVITE_FORM);
  const [settingsForm, setSettingsForm] = useState(INITIAL_SETTINGS_FORM);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingResyncBusy, setBillingResyncBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const busyActionRef = useRef<string | null>(null);
  const detailRequestSeq = useRef(0);
  const [ownerTransferMemberId, setOwnerTransferMemberId] = useState("");
  const [deleteOrganizationOpen, setDeleteOrganizationOpen] = useState(false);

  async function loadOrganizations(preferredId?: string | null) {
    setLoadingList(true);
    try {
      const res = await fetch("/api/organizations", { cache: "no-store" });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to load organizations");
      const nextOrganizations = Array.isArray(data?.organizations) ? (data.organizations as OrganizationListItem[]) : [];
      setOrganizations(nextOrganizations);
      const nextId =
        preferredId && nextOrganizations.some((item) => item.id === preferredId)
          ? preferredId
          : nextOrganizations[0]?.id || null;
      setSelectedId(nextId);
      return nextId;
    } finally {
      setLoadingList(false);
    }
  }

  async function loadOrganizationDetail(organizationId: string, options: { showLoading?: boolean } = {}) {
    const showLoading = options.showLoading ?? true;
    const requestSeq = ++detailRequestSeq.current;
    if (showLoading) setLoadingDetail(true);
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}`, {
        cache: "no-store",
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to load organization");
      if (requestSeq === detailRequestSeq.current) {
        setSelectedOrganization(data.organization as OrganizationDetail);
      }
      return data.organization as OrganizationDetail;
    } finally {
      if (showLoading && requestSeq === detailRequestSeq.current) setLoadingDetail(false);
    }
  }

  async function refresh(preferredId?: string | null) {
    try {
      setError(null);
      return await loadOrganizations(preferredId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load organizations"));
      return null;
    }
  }

  async function refreshSelectedOrganization(organizationId: string) {
    await loadOrganizationDetail(organizationId, { showLoading: false });
    await loadOrganizations(organizationId);
  }

  function startAction(key: string) {
    if (busyActionRef.current) return false;
    busyActionRef.current = key;
    setBusyAction(key);
    setError(null);
    setMessage(null);
    return true;
  }

  function finishAction() {
    busyActionRef.current = null;
    setBusyAction(null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      detailRequestSeq.current += 1;
      setLoadingDetail(false);
      setSelectedOrganization(null);
      setSettingsForm(INITIAL_SETTINGS_FORM);
      return;
    }
    void (async () => {
      try {
        setError(null);
        await loadOrganizationDetail(selectedId);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load organization"));
        setSelectedOrganization(null);
      }
    })();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedOrganization) {
      setSettingsForm(INITIAL_SETTINGS_FORM);
      setOwnerTransferMemberId("");
      return;
    }

    setSettingsForm({
      name: selectedOrganization.name,
      billingEmail: selectedOrganization.billingEmail || "",
      seatLimit: selectedOrganization.seatLimit ? String(selectedOrganization.seatLimit) : "",
      status: selectedOrganization.status || "active",
      tier: selectedOrganization.tier || "organization",
    });

    const firstEligibleOwnerTransferMember = selectedOrganization.members.find(
      (member) =>
        member.userId !== selectedOrganization.ownerUserId && member.status === "active"
    );
    setOwnerTransferMemberId(firstEligibleOwnerTransferMember?.id || "");
  }, [selectedOrganization]);

  const stats = useMemo(
    () =>
      organizations.reduce(
        (summary, item) => {
          summary.organizations += 1;
          summary.members += item._count.members;
          summary.pending += item.invitations.length;
          if (item.currentRole === "owner") summary.owned += 1;
          return summary;
        },
        { organizations: 0, members: 0, pending: 0, owned: 0 }
      ),
    [organizations]
  );

  async function handleCreateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startAction("create-organization")) return;
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          billingEmail: createForm.billingEmail || undefined,
          seatLimit: createForm.seatLimit ? Number(createForm.seatLimit) : undefined,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to create organization");
      setCreateForm(INITIAL_CREATE_FORM);
      setMessage(`Created ${data.organization.name}.`);
      await refresh(data.organization.id);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create organization"));
    } finally {
      finishAction();
    }
  }

  async function handleInviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !startAction("invite-member")) return;
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to add member");
      setInviteForm(INITIAL_INVITE_FORM);
      setMessage(data.member ? "Member added." : "Invitation saved.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to add member"));
    } finally {
      finishAction();
    }
  }

  async function refreshInvitation(invitation: Pick<OrganizationInvitation, "email" | "role">) {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !startAction(`refresh-invitation:${invitation.email}`)) return;
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: invitation.email,
          role: invitation.role,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to refresh invitation");
      setMessage("Invitation refreshed.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to refresh invitation"));
    } finally {
      finishAction();
    }
  }

  async function copyInvitationLink(invitation: OrganizationInvitation) {
    if (!invitation.token) {
      setError("Invitation link is not available for your role.");
      return;
    }

    try {
      setError(null);
      setMessage(null);
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "";
      const invitePath = `/organization-invitation/${encodeURIComponent(invitation.token)}`;
      const inviteUrl = origin ? `${origin}${invitePath}` : invitePath;
      const copied = await copyTextToClipboard(inviteUrl);
      setMessage(copied ? "Invitation link copied." : `Invitation link ready: ${inviteUrl}`);
    } catch {
      setError("Unable to copy the invitation link on this device.");
    }
  }

  async function resendInvitation(invitation: OrganizationInvitation) {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !startAction(`resend-invitation:${invitation.id}`)) return;

    try {
      const res = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitation.id)}/resend`,
        { method: "POST" }
      );
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to resend invitation");

      const refreshedInvitation = data?.invitation as OrganizationInvitation | undefined;
      if (refreshedInvitation?.token) {
        const origin =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "";
        const invitePath = `/organization-invitation/${encodeURIComponent(refreshedInvitation.token)}`;
        const inviteUrl = origin ? `${origin}${invitePath}` : invitePath;
        const copied = await copyTextToClipboard(inviteUrl);
        setMessage(copied ? "Fresh invitation link copied." : `Fresh invitation link ready: ${inviteUrl}`);
      } else {
        setMessage("Fresh invitation link created.");
      }

      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to resend invitation"));
    } finally {
      finishAction();
    }
  }

  async function handleUpdateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !selectedOrganization?.canAdminister || !startAction("update-organization")) return;

    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settingsForm.name,
          billingEmail: settingsForm.billingEmail || null,
          seatLimit: settingsForm.seatLimit ? Number(settingsForm.seatLimit) : null,
          status: settingsForm.status,
          tier: settingsForm.tier,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to update organization settings");
      setMessage("Organization settings updated.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update organization settings"));
    } finally {
      finishAction();
    }
  }

  async function updateMember(memberId: string, payload: { role?: string; status?: string }) {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !startAction(`update-member:${memberId}`)) return;
    try {
      const res = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to update member");
      setMessage("Member updated.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update member"));
    } finally {
      finishAction();
    }
  }

  async function removeMember(memberId: string) {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !startAction(`remove-member:${memberId}`)) return;
    try {
      const res = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}`,
        { method: "DELETE" }
      );
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to remove member");
      setMessage("Member removed.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove member"));
    } finally {
      finishAction();
    }
  }

  async function revokeInvitation(invitationId: string) {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !startAction(`revoke-invitation:${invitationId}`)) return;
    try {
      const res = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" }
      );
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to revoke invitation");
      setMessage("Invitation revoked.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to revoke invitation"));
    } finally {
      finishAction();
    }
  }

  function openOrganizationBilling() {
    if (!selectedOrganization) return;
    window.location.href = `/subscription?plan=organization&organizationId=${encodeURIComponent(selectedOrganization.id)}`;
  }

  async function cancelOrganizationBilling() {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !selectedOrganization?.canAdminister) return;

    try {
      setBillingBusy(true);
      setError(null);
      setMessage(null);
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/billing`, {
        method: "DELETE",
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to cancel organization billing");
      setMessage(data?.note || "Organization billing cancellation requested.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to cancel organization billing"));
    } finally {
      setBillingBusy(false);
    }
  }

  async function resyncOrganizationBilling() {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !selectedOrganization?.canAdminister) return;

    try {
      setBillingResyncBusy(true);
      setError(null);
      setMessage(null);
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/billing`, {
        method: "POST",
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to re-sync organization billing");
      setMessage(data?.message || "Organization billing re-synced from PayPal.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to re-sync organization billing"));
    } finally {
      setBillingResyncBusy(false);
    }
  }

  async function transferOwnership() {
    const organizationId = selectedOrganization?.id || selectedId;
    if (
      !organizationId ||
      !selectedOrganization?.canTransferOwnership ||
      !ownerTransferMemberId ||
      !startAction("transfer-ownership")
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: ownerTransferMemberId }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to transfer ownership");
      setMessage(data?.message || "Organization ownership transferred.");
      await refreshSelectedOrganization(organizationId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to transfer ownership"));
    } finally {
      finishAction();
    }
  }

  async function deleteOrganization() {
    const organizationId = selectedOrganization?.id || selectedId;
    if (!organizationId || !selectedOrganization?.canTransferOwnership || !startAction("delete-organization")) return;

    try {
      const deletedName = selectedOrganization.name;
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}`, {
        method: "DELETE",
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || "Failed to delete organization");
      setDeleteOrganizationOpen(false);
      setSelectedOrganization(null);
      setMessage(data?.message || `${deletedName} deleted.`);
      await refresh(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete organization"));
    } finally {
      finishAction();
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-sky-200/50 bg-linear-to-r from-slate-950 via-sky-900 to-cyan-800 p-6 text-white shadow-[0_20px_55px_-20px_rgba(14,165,233,0.55)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="border border-white/20 bg-white/15 text-white">Institution Tier</Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">Organizations</h1>
            <p className="max-w-3xl text-sm text-sky-50/90 sm:text-base">
              Manage institutional workspaces, roles, seats, and invitations from one production-ready surface.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void refresh(selectedId)}
            disabled={loadingList || loadingDetail || Boolean(busyAction)}
            className="bg-white text-sky-900 hover:bg-sky-50"
          >
            {loadingList || loadingDetail ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </section>

      {(error || message) && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertDescription>{error || message}</AlertDescription>
        </Alert>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Organizations" value={loadingList ? null : String(stats.organizations)} icon={<Building2 className="h-5 w-5 text-sky-600" />} />
        <StatCard title="Owned" value={loadingList ? null : String(stats.owned)} icon={<Crown className="h-5 w-5 text-amber-600" />} />
        <StatCard title="Members" value={loadingList ? null : String(stats.members)} icon={<Users className="h-5 w-5 text-emerald-600" />} />
        <StatCard title="Pending" value={loadingList ? null : String(stats.pending)} icon={<MailPlus className="h-5 w-5 text-violet-600" />} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border-sky-200/80 bg-linear-to-br from-white to-sky-50">
            <CardHeader>
              <CardTitle>Create organization</CardTitle>
              <CardDescription>Start a school or team workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateOrganization}>
                <Field label="Organization name">
                  <Input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Northgate Training Center" required />
                </Field>
                <Field label="Billing email">
                  <Input type="email" value={createForm.billingEmail} onChange={(event) => setCreateForm((current) => ({ ...current, billingEmail: event.target.value }))} placeholder="billing@school.edu" />
                </Field>
                <Field label="Seat limit">
                  <Input type="number" min={1} value={createForm.seatLimit} onChange={(event) => setCreateForm((current) => ({ ...current, seatLimit: event.target.value }))} placeholder="25" />
                </Field>
                <Button type="submit" className="w-full" disabled={Boolean(busyAction)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  {busyAction === "create-organization" ? "Creating..." : "Create organization"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your organizations</CardTitle>
              <CardDescription>Select a workspace to manage.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="space-y-3">
                  <SkeletonLoading className="h-20 w-full rounded-xl" />
                  <SkeletonLoading className="h-20 w-full rounded-xl" />
                </div>
              ) : organizations.length === 0 ? (
                <p className="text-sm text-slate-500">No organizations yet.</p>
              ) : (
                <ScrollPanel
                  className="border-slate-200 bg-slate-50"
                  viewportClassName="space-y-3"
                  maxHeightClassName="max-h-[380px]"
                >
                  {organizations.map((organization) => (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => setSelectedId(organization.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selectedId === organization.id
                          ? "border-sky-400 bg-sky-50"
                          : "border-slate-200 bg-white hover:border-sky-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{organization.name}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {organization.slug || "no-slug"} • {organization.tier}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 capitalize">
                          {organization.currentRole}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{organization._count.members} members</span>
                        <span>{organization.invitations.length} pending</span>
                        <span>{organization._count.classes} classes</span>
                      </div>
                    </button>
                  ))}
                </ScrollPanel>
              )}
            </CardContent>
          </Card>

          {!loadingDetail && selectedOrganization ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Pending invitations</CardTitle>
                  <CardDescription>
                    Refresh keeps the current token alive. Resend rotates to a fresh share link without creating duplicates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedOrganization.invitations.filter((item) => item.status === "pending").length === 0 ? (
                    <p className="text-sm text-slate-500">No pending invitations.</p>
                  ) : (
                    <ScrollPanel
                      className="border-slate-200 bg-slate-50"
                      viewportClassName="space-y-3"
                      maxHeightClassName="max-h-[420px]"
                    >
                      {selectedOrganization.invitations
                        .filter((item) => item.status === "pending")
                        .map((invitation) => (
                          <div key={invitation.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="min-w-0">
                              <p className="break-words font-medium text-slate-900">{invitation.email}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                <Badge variant="outline" className="capitalize">{invitation.role}</Badge>
                                <span>Created {formatDate(invitation.createdAt)}</span>
                                <span>Expires {formatDate(invitation.expiresAt)}</span>
                              </div>
                              {selectedOrganization.canAdminister && invitation.token ? (
                                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">Invite link ready to share</span>
                                </div>
                              ) : null}
                            </div>
                            {selectedOrganization.canAdminister ? (
                              <div className="flex min-w-0 flex-col gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  disabled={Boolean(busyAction) || !invitation.token}
                                  onClick={() => void copyInvitationLink(invitation)}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy link
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  disabled={Boolean(busyAction)}
                                  onClick={() => void resendInvitation(invitation)}
                                >
                                  <MailPlus className="mr-2 h-4 w-4" />
                                  {busyAction === `resend-invitation:${invitation.id}` ? "Resending..." : "Resend link"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  disabled={Boolean(busyAction)}
                                  onClick={() => void refreshInvitation(invitation)}
                                >
                                  <RotateCw className="mr-2 h-4 w-4" />
                                  {busyAction === `refresh-invitation:${invitation.email}` ? "Refreshing..." : "Refresh expiry"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  disabled={Boolean(busyAction)}
                                  onClick={() => void revokeInvitation(invitation.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {busyAction === `revoke-invitation:${invitation.id}` ? "Revoking..." : "Revoke"}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </ScrollPanel>
                  )}
                </CardContent>
              </Card>

              <Card className="border-rose-200 bg-rose-50/40">
                <CardHeader>
                  <CardTitle className="text-rose-700">Danger zone</CardTitle>
                  <CardDescription>
                    Delete this organization only after billing and workspace ownership are settled.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedOrganization.canTransferOwnership ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                      disabled={Boolean(busyAction)}
                      onClick={() => setDeleteOrganizationOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete organization
                    </Button>
                  ) : (
                    <div className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-slate-600">
                      Only the current organization owner can delete this organization.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          {loadingDetail ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <SkeletonLoading className="h-8 w-56" />
                <SkeletonLoading className="h-24 w-full rounded-2xl" />
                <SkeletonLoading className="h-40 w-full rounded-2xl" />
              </CardContent>
            </Card>
          ) : !selectedOrganization ? (
            <Card className="border-dashed border-slate-300 bg-slate-50">
              <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
                <Building2 className="h-10 w-10 text-slate-400" />
                <div>
                  <p className="font-semibold text-slate-900">Select an organization</p>
                  <p className="mt-1 text-sm text-slate-500">Choose a workspace on the left to manage members and invitations.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-sky-200 bg-sky-50 text-sky-700 capitalize">{selectedOrganization.tier}</Badge>
                        <Badge variant="outline" className="capitalize">{selectedOrganization.status}</Badge>
                        <Badge variant="outline">{selectedOrganization.slug || "no-slug"}</Badge>
                      </div>
                      <CardTitle className="text-2xl">{selectedOrganization.name}</CardTitle>
                      <CardDescription>
                        Owner: {selectedOrganization.ownerUser.name || selectedOrganization.ownerUser.username || selectedOrganization.ownerUser.email}
                      </CardDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
                      <MiniInfo label="Seats" value={selectedOrganization.seatLimit ? `${selectedOrganization.members.filter((m) => m.status === "active").length}/${selectedOrganization.seatLimit}` : `${selectedOrganization.members.filter((m) => m.status === "active").length}`} />
                      <MiniInfo label="Classes" value={String(selectedOrganization._count.classes)} />
                      <MiniInfo label="Assignments" value={String(selectedOrganization._count.assignments)} />
                      <MiniInfo label="Quizzes" value={String(selectedOrganization._count.quizzes)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard label="Billing email" value={selectedOrganization.billingEmail || "Not set"} />
                  <InfoCard label="Created" value={formatDate(selectedOrganization.createdAt)} />
                  <InfoCard label="Updated" value={formatDate(selectedOrganization.updatedAt)} />
                  <InfoCard label="Pending invites" value={String(selectedOrganization.invitations.filter((item) => item.status === "pending").length)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>Organization billing</CardTitle>
                      <CardDescription>
                        View current institution billing state and jump into the PayPal-managed organization checkout flow.
                      </CardDescription>
                    </div>
                    {selectedOrganization.canAdminister ? (
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => void resyncOrganizationBilling()}
                          disabled={billingResyncBusy || Boolean(busyAction) || !selectedOrganization.subscriptions[0]?.providerSubscriptionId}
                        >
                          <RotateCw className="mr-2 h-4 w-4" />
                          {billingResyncBusy ? "Re-syncing..." : "Re-sync billing"}
                        </Button>
                        <Button type="button" className="w-full sm:w-auto" disabled={Boolean(busyAction)} onClick={openOrganizationBilling}>
                          <Building2 className="mr-2 h-4 w-4" />
                          {selectedOrganization.subscriptions[0]?.status === "active"
                            ? "Manage billing"
                            : "Start organization billing"}
                        </Button>
                        {selectedOrganization.subscriptions[0]?.providerSubscriptionId ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:w-auto"
                            disabled={billingBusy || Boolean(busyAction)}
                            onClick={() => void cancelOrganizationBilling()}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {billingBusy ? "Cancelling..." : "Cancel billing"}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
                  <InfoCard
                    label="Billing status"
                    value={selectedOrganization.subscriptions[0]?.status || "Not started"}
                  />
                  <InfoCard
                    label="Provider"
                    value={selectedOrganization.subscriptions[0]?.provider || "PayPal ready"}
                  />
                  <InfoCard
                    label="Plan"
                    value={selectedOrganization.subscriptions[0]?.plan || "organization"}
                  />
                  <InfoCard
                    label="Current period ends"
                    value={formatDate(selectedOrganization.subscriptions[0]?.currentPeriodEnd || null)}
                  />
                  <InfoCard
                    label="Seat allocation"
                    value={String(
                      selectedOrganization.subscriptions[0]?.seatCount || selectedOrganization.seatLimit || 0
                    ) || "Not set"}
                  />
                </CardContent>
                {selectedOrganization.canAdminister && selectedOrganization.subscriptions[0]?.providerSubscriptionId ? (
                  <CardContent className="border-t border-slate-100 px-6 py-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Provider subscription</p>
                    <p className="mt-2 break-all text-sm font-medium text-slate-900">
                      {selectedOrganization.subscriptions[0]?.providerSubscriptionId}
                    </p>
                  </CardContent>
                ) : null}
                {selectedOrganization.subscriptions.length > 0 ? (
                  <CardContent className="border-t border-slate-100 px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Billing history</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Recent organization subscription snapshots for support and reconciliation.
                        </p>
                      </div>
                    </div>
                    <ScrollPanel
                      className="mt-4 border-slate-200 bg-slate-50"
                      viewportClassName="overflow-x-auto"
                      maxHeightClassName="max-h-[320px]"
                    >
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-slate-500">
                            <th className="px-0 py-2 pr-4 font-medium">Status</th>
                            <th className="px-0 py-2 pr-4 font-medium">Plan</th>
                            <th className="px-0 py-2 pr-4 font-medium">Updated</th>
                            <th className="px-0 py-2 pr-4 font-medium">Period ends</th>
                            {selectedOrganization.canAdminister ? (
                              <th className="px-0 py-2 pr-4 font-medium">Billing owner</th>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrganization.subscriptions.map((subscription) => (
                            <tr key={subscription.id} className="border-b border-slate-100/80 align-top last:border-0">
                              <td className="px-0 py-3 pr-4">
                                <Badge variant="outline" className="capitalize">
                                  {subscription.status}
                                </Badge>
                              </td>
                              <td className="px-0 py-3 pr-4 capitalize">{subscription.plan}</td>
                              <td className="px-0 py-3 pr-4">{formatDate(subscription.updatedAt)}</td>
                              <td className="px-0 py-3 pr-4">
                                {formatDate(subscription.currentPeriodEnd || null)}
                              </td>
                              {selectedOrganization.canAdminister ? (
                                <td className="px-0 py-3 pr-4">
                                  {subscription.billingUser
                                    ? subscription.billingUser.name ||
                                      subscription.billingUser.username ||
                                      subscription.billingUser.email
                                    : subscription.billingEmail || "Not set"}
                                </td>
                              ) : null}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollPanel>
                  </CardContent>
                ) : null}
              </Card>

              <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[340px_minmax(0,1fr)]">
                <Card className="h-205">
                  <CardHeader>
                    <CardTitle>Organization settings</CardTitle>
                    <CardDescription>
                      {selectedOrganization.canAdminister
                        ? "Update the workspace profile, seat cap, and lifecycle status."
                        : "Only organization owners and admins can update workspace settings."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedOrganization.canAdminister ? (
                      <form className="space-y-4" onSubmit={handleUpdateOrganization}>
                        <Field label="Organization name">
                          <Input
                            value={settingsForm.name}
                            onChange={(event) =>
                              setSettingsForm((current) => ({ ...current, name: event.target.value }))
                            }
                            placeholder="Northgate Training Center"
                            required
                          />
                        </Field>
                        <Field label="Billing email">
                          <Input
                            type="email"
                            value={settingsForm.billingEmail}
                            onChange={(event) =>
                              setSettingsForm((current) => ({
                                ...current,
                                billingEmail: event.target.value,
                              }))
                            }
                            placeholder="billing@school.edu"
                          />
                        </Field>
                        <Field label="Seat limit">
                          <Input
                            type="number"
                            min={1}
                            value={settingsForm.seatLimit}
                            onChange={(event) =>
                              setSettingsForm((current) => ({ ...current, seatLimit: event.target.value }))
                            }
                            placeholder="25"
                          />
                        </Field>
                        <Field label="Organization tier">
                          <select
                            value={settingsForm.tier}
                            onChange={(event) =>
                              setSettingsForm((current) => ({ ...current, tier: event.target.value }))
                            }
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                          >
                            <option value="organization">Organization</option>
                            <option value="enterprise">Enterprise</option>
                            <option value="premium">Premium</option>
                          </select>
                        </Field>
                        <Field label="Workspace status">
                          <select
                            value={settingsForm.status}
                            onChange={(event) =>
                              setSettingsForm((current) => ({ ...current, status: event.target.value }))
                            }
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                          >
                            <option value="active">Active</option>
                            <option value="trialing">Trialing</option>
                            <option value="suspended">Suspended</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </Field>
                        <Button type="submit" className="w-full" disabled={Boolean(busyAction)}>
                          <Building2 className="mr-2 h-4 w-4" />
                          {busyAction === "update-organization" ? "Saving..." : "Save settings"}
                        </Button>
                      </form>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        You can review this workspace, but organization settings are reserved for admins.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Owner transfer</CardTitle>
                      <CardDescription>
                        {selectedOrganization.canTransferOwnership
                          ? "Move workspace ownership to another active member without breaking the admin lane."
                          : "Only the current owner can transfer organization ownership."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedOrganization.canTransferOwnership ? (
                        selectedOrganization.members.some(
                          (member) =>
                            member.userId !== selectedOrganization.ownerUserId &&
                            member.status === "active"
                        ) ? (
                          <div className="space-y-4">
                            <Field label="New owner">
                              <select
                                value={ownerTransferMemberId}
                                onChange={(event) => setOwnerTransferMemberId(event.target.value)}
                                disabled={Boolean(busyAction)}
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              >
                                {selectedOrganization.members
                                  .filter(
                                    (member) =>
                                      member.userId !== selectedOrganization.ownerUserId &&
                                      member.status === "active"
                                  )
                                  .map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.user.name || member.user.username || member.user.email} ·{" "}
                                      {member.role}
                                    </option>
                                  ))}
                              </select>
                            </Field>
                            <Button type="button" variant="outline" className="w-full" disabled={Boolean(busyAction)} onClick={() => void transferOwnership()}>
                              <Crown className="mr-2 h-4 w-4" />
                              {busyAction === "transfer-ownership" ? "Transferring..." : "Transfer ownership"}
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            Add at least one other active member before transferring ownership.
                          </div>
                        )
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          Ownership transfer stays reserved for the current workspace owner.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Invite member</CardTitle>
                      <CardDescription>
                        {selectedOrganization.canAdminister
                          ? "Add an existing user or create a pending invitation."
                          : "Only organization owners and admins can invite or manage members."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedOrganization.canAdminister ? (
                        <form className="space-y-4" onSubmit={handleInviteMember}>
                          <Field label="Email">
                            <Input type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} placeholder="teacher@school.edu" required />
                          </Field>
                          <Field label="Role">
                            <select
                              value={inviteForm.role}
                              onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))}
                              disabled={Boolean(busyAction)}
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                          >
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                          </select>
                        </Field>
                          <Button type="submit" className="w-full" disabled={Boolean(busyAction)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            {busyAction === "invite-member" ? "Adding..." : "Add member or invite"}
                          </Button>
                        </form>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          You can review this workspace, but invite controls are reserved for organization admins.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Members</CardTitle>
                      <CardDescription>Admins manage org settings; teachers keep content-access rights only.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedOrganization.members.length === 0 ? (
                        <p className="text-sm text-slate-500">No members yet.</p>
                      ) : (
                        <ScrollPanel
                          className="border-slate-200 bg-slate-50"
                          viewportClassName="space-y-3"
                          maxHeightClassName="max-h-[520px]"
                        >
                          {selectedOrganization.members.map((member) => {
                            const isOwner = member.userId === selectedOrganization.ownerUserId;
                            return (
                              <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                      <p className="min-w-0 truncate font-semibold text-slate-900">
                                        {member.user.name || member.user.username || member.user.email}
                                      </p>
                                      {isOwner ? (
                                        <Badge className="shrink-0 border-amber-200 bg-amber-50 text-amber-700">
                                          <Crown className="mr-1 h-3 w-3" />
                                          Owner
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="shrink-0 capitalize">
                                          {member.status}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="mt-1 break-words text-sm text-slate-500">{member.user.email}</p>
                                  </div>
                                  {!isOwner && selectedOrganization.canAdminister && (
                                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                                      <select
                                        value={member.role}
                                        onChange={(event) => void updateMember(member.id, { role: event.target.value })}
                                        disabled={Boolean(busyAction)}
                                        className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 sm:w-auto"
                                      >
                                        <option value="admin">Admin</option>
                                        <option value="teacher">Teacher</option>
                                      </select>
                                      <select
                                        value={member.status}
                                        onChange={(event) => void updateMember(member.id, { status: event.target.value })}
                                        disabled={Boolean(busyAction)}
                                        className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 sm:w-auto"
                                      >
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                      </select>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:w-auto"
                                        disabled={Boolean(busyAction)}
                                        onClick={() => void removeMember(member.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {busyAction === `remove-member:${member.id}` ? "Removing..." : "Remove"}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </ScrollPanel>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <ConfirmActionModal
        open={deleteOrganizationOpen}
        onOpenChange={setDeleteOrganizationOpen}
        title="Delete organization?"
        description={
          selectedOrganization
            ? `This permanently deletes ${selectedOrganization.name}. Existing linked classes, assignments, quizzes, and lesson plans will no longer belong to this organization. Cancel active billing first.`
            : "This permanently deletes the selected organization."
        }
        confirmLabel="Delete organization"
        loading={busyAction === "delete-organization"}
        onConfirm={deleteOrganization}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | null;
  icon: ReactNode;
}) {
  return (
    <Card className="border-slate-200 bg-linear-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl">
          {icon}
          {value === null ? <SkeletonLoading className="h-8 w-14" /> : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
