"use client";

import { useId } from "react";
import Select, { type StylesConfig } from "react-select";

export type AppSelectOption = {
  value: string;
  label: string;
};

const selectStyles: StylesConfig<AppSelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 12,
    borderColor: state.isFocused ? "#C2410C" : "#E3E6EB",
    backgroundColor: state.isDisabled ? "#F6F7F9" : "#ffffff",
    boxShadow: "none",
    cursor: state.isDisabled ? "not-allowed" : "default",
    "&:hover": {
      borderColor: state.isFocused ? "#C2410C" : "#C2410C",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 12px",
  }),
  singleValue: (base, state) => ({
    ...base,
    color: state.isDisabled ? "#4B5563" : "#111827",
    fontSize: 14,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#4B5563",
    fontSize: 14,
  }),
  input: (base) => ({
    ...base,
    color: "#111827",
    fontSize: 14,
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "#C2410C" : "#4B5563",
    paddingRight: 10,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 40,
    overflow: "hidden",
    borderRadius: 12,
    border: "1px solid #E3E6EB",
    boxShadow: "0 12px 32px rgba(28, 40, 52, 0.12)",
  }),
  menuList: (base) => ({
    ...base,
    padding: 4,
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: state.isSelected ? "#C2410C" : state.isFocused ? "#FFF7F2" : "transparent",
    color: state.isSelected ? "#F6F7F9" : "#111827",
    ":active": {
      backgroundColor: state.isSelected ? "#C2410C" : "#FFE4D6",
    },
  }),
};

export function AppSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  searchable = false,
  placeholder = "Choose",
}: {
  label?: string;
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  placeholder?: string;
}) {
  const inputId = useId().replace(/:/g, "");
  const selected = options.find((option) => option.value === value) ?? null;
  const control = (
    <Select
      inputId={inputId}
      instanceId={inputId}
      options={options}
      value={selected}
      placeholder={placeholder}
      isDisabled={disabled}
      isSearchable={searchable}
      isClearable={false}
      menuPlacement="auto"
      menuPosition="fixed"
      onChange={(option) => {
        if (option) onChange(option.value);
      }}
      styles={selectStyles}
    />
  );

  if (!label) return control;

  return (
    <div className="grid min-w-0 gap-1">
      <label
        htmlFor={inputId}
        className="text-xs font-semibold tracking-wider text-[#4B5563] uppercase"
      >
        {label}
      </label>
      {control}
    </div>
  );
}
