import React from "react";
import styles from "@/styles/components/Input.module.css";

interface DateInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
}

export const DateInputField: React.FC<DateInputFieldProps> = ({
  label,
  inputId,
  placeholder = "Select date",
  defaultValue,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>{label}</p>
      <input
        type="datetime-local"
        placeholder={placeholder}
        id={inputId}
        className={styles.dateInput}
        defaultValue={defaultValue}
      />
    </div>
  );
};
