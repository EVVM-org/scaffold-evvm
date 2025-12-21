import React from "react";
import styles from "@/components/SigConstructors/SignatureConstructor.module.css";

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
        className={styles.numberInput}
        defaultValue={defaultValue}
      />
    </div>
  );
};
