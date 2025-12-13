import React from "react";
import styles from "@/styles/components/Input.module.css";

interface NumberInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
}

export const NumberInputField: React.FC<NumberInputFieldProps> = ({
  label,
  inputId,
  placeholder = "Enter number",
  defaultValue,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>{label}</p>
      <input
        type="number"
        placeholder={placeholder}
        id={inputId}
        className={styles.numberWithGeneratorInput}
        defaultValue={defaultValue}
      />
    </div>
  );
};
