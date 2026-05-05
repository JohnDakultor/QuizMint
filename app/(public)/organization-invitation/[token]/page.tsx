"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  LogIn,
  MailWarning,
  ShieldAlert,
  UserPlus,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SkeletonLoading from "@/components/ui/skeleton-loading";

type InvitationPayload = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string | null;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    tier: string;
  };
};

type InvitationResponse = {
  invitation: InvitationPayload;
  matchesCurrentUser: boolean;
  expired: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not set"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}

export default function OrganizationInvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? "";

  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const callbackUrl = useMemo(() => {
    if (!token) return "/organizations";
    return `/organization-invitation/${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let active = true;
    void (async () => {
      setLoading(true);
      setUnauthorized(false);
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`/api/organizations/invitations/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (!active) return;

        if (res.status === 401) {
          setUnauthorized(true);
          setInvitation(null);
          return;
        }
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load invitation");
        }

        setInvitation(data as InvitationResponse);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load invitation");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleAcceptInvitation() {
    if (!token) return;

    setAccepting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/invitations/${encodeURIComponent(token)}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || "Failed to accept invitation");
      }

      setMessage("Invitation accepted. Redirecting to your organization workspace...");
      window.setTimeout(() => {
        router.push("/organizations");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-sky-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-sky-200/60 bg-linear-to-r from-slate-950 via-sky-900 to-cyan-800 p-6 text-white shadow-[0_20px_55px_-20px_rgba(14,165,233,0.45)]">
          <div className="space-y-2">
            <Badge className="border border-white/20 bg-white/15 text-white">Organization Invite</Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">Join an organization workspace</h1>
            <p className="max-w-2xl text-sm text-sky-50/90 sm:text-base">
              Review the invitation details, confirm the email matches your account, and join the
              institutional workspace without leaving the flow.
            </p>
          </div>
        </section>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-6">
              <SkeletonLoading className="h-8 w-56" />
              <SkeletonLoading className="h-24 w-full rounded-2xl" />
              <SkeletonLoading className="h-28 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ) : unauthorized ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <LogIn className="h-5 w-5" />
                Sign in to continue
              </CardTitle>
              <CardDescription className="text-amber-800/80">
                This invitation can only be checked by a signed-in user. Sign in first, then we’ll
                bring you right back here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="bg-amber-600 text-white hover:bg-amber-700">
                <Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in and continue
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : invitation ? (
          <>
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-sky-200 bg-sky-50 text-sky-700 capitalize">
                    {invitation.invitation.organization.tier}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {invitation.invitation.role}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {invitation.invitation.status}
                  </Badge>
                </div>
                <CardTitle className="mt-2 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-sky-600" />
                  {invitation.invitation.organization.name}
                </CardTitle>
                <CardDescription>
                  You were invited as <strong>{invitation.invitation.role}</strong> for{" "}
                  <strong>{invitation.invitation.email}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <InfoCard label="Slug" value={invitation.invitation.organization.slug || "Not set"} />
                <InfoCard label="Expires" value={formatDate(invitation.invitation.expiresAt)} />
                <InfoCard label="Status" value={invitation.invitation.status} />
              </CardContent>
            </Card>

            {!invitation.matchesCurrentUser && (
              <Alert variant="destructive">
                <MailWarning className="h-4 w-4" />
                <AlertDescription>
                  This invitation is for <strong>{invitation.invitation.email}</strong>. Sign in
                  with that exact email address before accepting it.
                </AlertDescription>
              </Alert>
            )}

            {invitation.expired && (
              <Alert variant="destructive">
                <Clock3 className="h-4 w-4" />
                <AlertDescription>
                  This invitation has expired. Ask an organization admin to send a fresh invite.
                </AlertDescription>
              </Alert>
            )}

            {invitation.invitation.status !== "pending" && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  This invitation is already marked as <strong>{invitation.invitation.status}</strong>.
                </AlertDescription>
              </Alert>
            )}

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Accept invitation</CardTitle>
                <CardDescription>
                  Production rule: only the invited email can accept, and owner transfer is kept
                  outside this flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleAcceptInvitation}
                  disabled={
                    accepting ||
                    !invitation.matchesCurrentUser ||
                    invitation.expired ||
                    invitation.invitation.status !== "pending"
                  }
                  className="bg-sky-600 text-white hover:bg-sky-700"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {accepting ? "Accepting..." : "Accept invitation"}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/organizations">
                    <Building2 className="mr-2 h-4 w-4" />
                    Go to organizations
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                If you are signed in with the wrong account, sign out and return using the invited
                email address.
              </AlertDescription>
            </Alert>
          </>
        ) : null}
      </div>
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
