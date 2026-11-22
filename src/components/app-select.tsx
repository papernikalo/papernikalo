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
    borderColor: state.isFocused ? "#1d4e89" : "#d5dee6",
    backgroundColor: state.isDisabled ? "#f3f5f7" : "#ffffff",
    boxShadow: "none",
    cursor: state.isDisabled ? "not-allowed" : "default",
    "&:hover": {
      borderColor: state.isFocused ? "#1d4e89" : "#8aa4bc",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 12px",
  }),
  singleValue: (base, state) => ({
    ...base,
    color: state.isDisabled ? "#52606d" : "#1c2834",
    fontSize: 14,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#52606d",
    fontSize: 14,
  }),
  input: (base) => ({
    ...base,
    color: "#1c2834",
    fontSize: 14,
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "#1d4e89" : "#52606d",
    paddingRight: 10,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 40,
    overflow: "hidden",
    borderRadius: 12,
    border: "1px solid #d5dee6",
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
    backgroundColor: state.isSelected ? "#1d4e89" : state.isFocused ? "#e7eef5" : "transparent",
    color: state.isSelected ? "#f3f5f7" : "#1c2834",
    ":active": {
      backgroundColor: state.isSelected ? "#1d4e89" : "#d6e6f2",
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
        className="text-xs font-semibold tracking-wider text-[#52606d] uppercase"
      >
        {label}
      </label>
      {control}
    </div>
  );
}
