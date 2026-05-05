"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2 } from "lucide-react";

const inquiryTypes = [
  "Organization plan",
  "Teacher onboarding",
  "Support or billing",
  "Product question",
  "Partnership",
];

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [inquiryType, setInquiryType] = useState(inquiryTypes[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message: [
            `Inquiry type: ${inquiryType}`,
            organization ? `Organization: ${organization}` : null,
            "",
            message,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setSuccess("Thanks. We'll review your message and get back to you soon.");
      setInquiryType(inquiryTypes[0]);
      setName("");
      setEmail("");
      setOrganization("");
      setMessage("");
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
            <Mail className="h-5 w-5" />
          </span>
          Send a Message
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Share what you need, and include team size or workflow goals if you
          are asking about an organization plan.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {success && (
            <p className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              {success}
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="inquiryType">What can we help with?</Label>
            <select
              id="inquiryType"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-xs outline-none transition focus-visible:border-teal-700 focus-visible:ring-[3px] focus-visible:ring-teal-700/20 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {inquiryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aisha Khan"
              className="h-11 border-slate-300 dark:border-zinc-700"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 border-slate-300 dark:border-zinc-700"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">School or organization</Label>
            <Input
              id="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Optional"
              className="h-11 border-slate-300 dark:border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your classes, team size, workflow goals, billing question, or support issue..."
              className="min-h-36 border-slate-300 dark:border-zinc-700"
              required
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-teal-700 text-white hover:bg-teal-800"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
