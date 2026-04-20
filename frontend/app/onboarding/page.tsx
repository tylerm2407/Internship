"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, X, Plus, PencilSimple, Check } from "@phosphor-icons/react";
import { useUploadStore } from "../../lib/store";
import { saveProfile } from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import type { StudentProfile, PriorExperience } from "../../lib/types";

const ROLE_GROUPS = [
  {
    label: "Investment Banking & Advisory",
    roles: ["Investment Banking", "Capital Markets", "Restructuring"],
  },
  {
    label: "Markets & Trading",
    roles: ["Sales & Trading", "Quant"],
  },
  {
    label: "Investing & Research",
    roles: [
      "Private Equity",
      "Hedge Fund",
      "Asset Management",
      "Equity Research",
      "Real Estate",
      "Credit / Leveraged Finance",
    ],
  },
  {
    label: "Corporate & Risk",
    roles: [
      "Corporate Finance / FP&A",
      "Risk Management",
      "Compliance",
      "Insurance",
    ],
  },
  {
    label: "Advisory",
    roles: ["Wealth Management", "Consulting (Finance)"],
  },
];

const GEO_OPTIONS = [
  "NYC",
  "Boston",
  "Chicago",
  "San Francisco",
  "Houston",
  "Charlotte",
  "Los Angeles",
  "Other",
];

const STEPS = [
  { label: "Target Roles", number: 1 },
  { label: "Geographies", number: 2 },
  { label: "Confirm Details", number: 3 },
];

// ── Chip Toggle ──
function ChipToggle({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-4 py-2 rounded-md text-sm border transition-colors cursor-pointer ${
              active
                ? "bg-accent text-white border-accent"
                : "bg-surface text-ink-secondary border-surface-border hover:bg-surface-hover"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Tag Input ──
function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-surface-hover text-sm px-3 py-1 rounded-md border border-surface-border"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-ink-tertiary hover:text-ink-primary cursor-pointer"
              aria-label={`Remove ${tag}`}
            >
              <X size={12} weight="bold" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder || "Add item..."}
          className="flex-1 bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={addTag}
          className="px-3 py-2 bg-surface border border-surface-border rounded-md text-ink-secondary hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}

// ── Experience Card ──
function ExperienceCard({
  exp,
  onUpdate,
  onRemove,
}: {
  exp: PriorExperience;
  onUpdate: (updated: PriorExperience) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(exp);

  const save = () => {
    onUpdate(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-surface-hover border border-surface-border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            placeholder="Role"
            className="bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <input
            value={draft.organization}
            onChange={(e) =>
              setDraft({ ...draft, organization: e.target.value })
            }
            placeholder="Organization"
            className="bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <input
          value={draft.dates}
          onChange={(e) => setDraft({ ...draft, dates: e.target.value })}
          placeholder="Dates"
          className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <textarea
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          placeholder="Summary"
          rows={2}
          className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
        />
        <TagInput
          tags={draft.bullets}
          onChange={(bullets) => setDraft({ ...draft, bullets })}
          placeholder="Add bullet point..."
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline cursor-pointer"
          >
            <Check size={14} weight="bold" /> Save
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(exp);
              setEditing(false);
            }}
            className="text-sm text-ink-secondary hover:underline cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-600 hover:underline cursor-pointer ml-auto"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surface-border rounded-lg p-4 space-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{exp.role}</p>
          <p className="text-sm text-ink-secondary">
            {exp.organization}
            {exp.dates && ` · ${exp.dates}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-ink-secondary hover:text-ink-primary cursor-pointer"
          aria-label="Edit experience"
        >
          <PencilSimple size={16} weight="regular" />
        </button>
      </div>
      {exp.summary && (
        <p className="text-sm text-ink-secondary">{exp.summary}</p>
      )}
      {exp.bullets.length > 0 && (
        <ul className="list-disc list-inside text-sm text-ink-secondary space-y-0.5 pt-1">
          {exp.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Step Indicator ──
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-3">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 flex items-center justify-center rounded-md font-mono text-xs font-medium ${
                current === step.number
                  ? "bg-accent text-white"
                  : current > step.number
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-hover text-ink-tertiary"
              }`}
            >
              {current > step.number ? (
                <Check size={14} weight="bold" />
              ) : (
                step.number
              )}
            </span>
            <span
              className={`text-xs font-medium ${
                current === step.number ? "text-ink-primary" : "text-ink-tertiary"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-8 h-px bg-surface-border" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──

export default function OnboardingPage() {
  const router = useRouter();
  const { parsedProfile, setParsedProfile, setSavedProfile } = useUploadStore();
  const [saving, setSaving] = useState(false);
  const [navigatingAway, setNavigatingAway] = useState(false);
  const [step, setStep] = useState(1);

  // Local editable copy of the profile
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    if (parsedProfile) {
      setProfile({ ...parsedProfile });
    }
  }, [parsedProfile]);

  // Redirect if no profile was parsed — but wait for hydration
  // and skip if we're navigating to dashboard after save
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !parsedProfile && !navigatingAway) {
      router.replace("/upload");
    }
  }, [hydrated, parsedProfile, navigatingAway, router]);

  const updateField = useCallback(
    <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
      setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const result = await saveProfile(profile);
      setSavedProfile(result.profile);
      setNavigatingAway(true);
      setParsedProfile(null);
      toast.success("Profile saved. Loading your opportunities...");
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile"
      );
      setSaving(false);
    }
  }

  function handleStartOver() {
    setNavigatingAway(true);
    setParsedProfile(null);
    router.push("/upload");
  }

  if (!profile) return null;

  return (
    <AuthGuard>
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </a>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
          {/* Page header */}
          <div className="space-y-3">
            <h1 className="font-serif text-4xl tracking-tight">
              Review your profile
            </h1>
            <p className="text-base text-ink-secondary leading-relaxed max-w-2xl">
              Check every field. Claude Vision sometimes misreads GPAs or
              invents coursework. If something is wrong, fix it now — every
              downstream feature uses this data.
            </p>
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* ── Step 1: Target Roles ── */}
          {step === 1 && (
            <Card>
              <EyebrowLabel className="mb-2 block">Step 1 of 3</EyebrowLabel>
              <h2 className="font-serif text-2xl tracking-tight mb-1">
                Target roles
              </h2>
              <p className="text-sm text-ink-secondary mb-5">
                Select the roles you are recruiting for. You can choose multiple.
              </p>
              <div className="space-y-5">
                {ROLE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-2">
                      {group.label}
                    </p>
                    <ChipToggle
                      options={group.roles}
                      selected={profile.target_roles}
                      onChange={(v) => updateField("target_roles", v)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-6">
                <PrimaryButton
                  onClick={() => setStep(2)}
                  disabled={profile.target_roles.length === 0}
                  className={profile.target_roles.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                  icon={<ArrowRight size={16} weight="regular" />}
                >
                  Next
                </PrimaryButton>
                <SecondaryButton onClick={handleStartOver}>
                  Start over
                </SecondaryButton>
              </div>
            </Card>
          )}

          {/* ── Step 2: Target Geographies ── */}
          {step === 2 && (
            <Card>
              <EyebrowLabel className="mb-2 block">Step 2 of 3</EyebrowLabel>
              <h2 className="font-serif text-2xl tracking-tight mb-1">
                Target geographies
              </h2>
              <p className="text-sm text-ink-secondary mb-5">
                Where do you want to work? Select all that apply.
              </p>
              <ChipToggle
                options={GEO_OPTIONS}
                selected={profile.target_geographies}
                onChange={(v) => updateField("target_geographies", v)}
              />
              <div className="flex items-center gap-3 mt-6">
                <SecondaryButton
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1"
                >
                  <ArrowLeft size={16} weight="regular" />
                  Back
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => setStep(3)}
                  disabled={profile.target_geographies.length === 0}
                  className={profile.target_geographies.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                  icon={<ArrowRight size={16} weight="regular" />}
                >
                  Next
                </PrimaryButton>
              </div>
            </Card>
          )}

          {/* ── Step 3: Confirm Details ── */}
          {step === 3 && (
            <div className="space-y-6">
              <Card>
                <EyebrowLabel className="mb-2 block">Step 3 of 3</EyebrowLabel>
                <h2 className="font-serif text-2xl tracking-tight mb-1">
                  Confirm your details
                </h2>
                <p className="text-sm text-ink-secondary mb-5">
                  Verify the information below before saving your profile.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-ink-secondary mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-secondary mb-1">
                      School
                    </label>
                    <input
                      type="text"
                      value={profile.school}
                      onChange={(e) => updateField("school", e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-secondary mb-1">
                      Major
                    </label>
                    <input
                      type="text"
                      value={profile.major}
                      onChange={(e) => updateField("major", e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-secondary mb-1">
                      GPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4.0"
                      value={profile.gpa ?? ""}
                      onChange={(e) =>
                        updateField(
                          "gpa",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-secondary mb-1">
                      Minor
                    </label>
                    <input
                      type="text"
                      value={profile.minor || ""}
                      onChange={(e) =>
                        updateField("minor", e.target.value || null)
                      }
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-secondary mb-1">
                      Languages
                    </label>
                    <input
                      type="text"
                      value={profile.languages.join(", ")}
                      onChange={(e) =>
                        updateField(
                          "languages",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="e.g. English, Spanish"
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </Card>

              {/* Summary of selections */}
              <Card>
                <EyebrowLabel className="mb-3 block">Your selections</EyebrowLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-ink-secondary">Target roles</p>
                    <p className="font-medium mt-0.5">
                      {profile.target_roles.length > 0
                        ? profile.target_roles.join(", ")
                        : "None selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-secondary">Target geographies</p>
                    <p className="font-medium mt-0.5">
                      {profile.target_geographies.length > 0
                        ? profile.target_geographies.join(", ")
                        : "None selected"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Technical Skills */}
              <Card>
                <EyebrowLabel className="mb-4 block">
                  Technical skills
                </EyebrowLabel>
                <TagInput
                  tags={profile.technical_skills}
                  onChange={(v) => updateField("technical_skills", v)}
                  placeholder="e.g. Excel, DCF valuation, Bloomberg..."
                />
              </Card>

              {/* Coursework */}
              <Card>
                <EyebrowLabel className="mb-4 block">Coursework</EyebrowLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-ink-secondary mb-2">Completed</p>
                    <TagInput
                      tags={profile.coursework_completed}
                      onChange={(v) => updateField("coursework_completed", v)}
                      placeholder="Add completed course..."
                    />
                  </div>
                  <div>
                    <p className="text-sm text-ink-secondary mb-2">In progress</p>
                    <TagInput
                      tags={profile.coursework_in_progress}
                      onChange={(v) => updateField("coursework_in_progress", v)}
                      placeholder="Add current course..."
                    />
                  </div>
                </div>
              </Card>

              {/* Clubs & Certifications */}
              <Card>
                <EyebrowLabel className="mb-4 block">
                  Clubs & certifications
                </EyebrowLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-ink-secondary mb-2">Clubs</p>
                    <TagInput
                      tags={profile.clubs}
                      onChange={(v) => updateField("clubs", v)}
                      placeholder="Add club..."
                    />
                  </div>
                  <div>
                    <p className="text-sm text-ink-secondary mb-2">
                      Certifications
                    </p>
                    <TagInput
                      tags={profile.certifications}
                      onChange={(v) => updateField("certifications", v)}
                      placeholder="Add certification..."
                    />
                  </div>
                </div>
              </Card>

              {/* Prior Experience */}
              <Card>
                <EyebrowLabel className="mb-4 block">
                  Prior experience
                </EyebrowLabel>
                <div className="space-y-3">
                  {profile.prior_experience.map((exp, i) => (
                    <ExperienceCard
                      key={i}
                      exp={exp}
                      onUpdate={(updated) => {
                        const copy = [...profile.prior_experience];
                        copy[i] = updated;
                        updateField("prior_experience", copy);
                      }}
                      onRemove={() => {
                        const copy = profile.prior_experience.filter(
                          (_, j) => j !== i
                        );
                        updateField("prior_experience", copy);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateField("prior_experience", [
                        ...profile.prior_experience,
                        {
                          role: "",
                          organization: "",
                          summary: "",
                          dates: "",
                          bullets: [],
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline cursor-pointer"
                  >
                    <Plus size={14} weight="bold" /> Add experience
                  </button>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 pb-8">
                <SecondaryButton
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1"
                >
                  <ArrowLeft size={16} weight="regular" />
                  Back
                </SecondaryButton>
                <PrimaryButton onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Go to Dashboard"}
                  {!saving && (
                    <ArrowRight size={16} weight="regular" />
                  )}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
