"use client";

interface TextFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (text: string) => void;
}

export function TextField({ label, placeholder, value, onChange }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "尚未記錄"}
        rows={2}
        className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[15px] leading-snug placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
