import React from "react";
import styles from "@/components/SigConstructors/SignatureConstructor.module.css";

interface TextInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  inputId,
  placeholder = "Enter text",
  defaultValue,
  onChange,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>{label}</p>
      <input
        type="text"
        placeholder={placeholder}
        id={inputId}
        className={styles.textInput}
        defaultValue={defaultValue}
        onChange={onChange}
      />
    </div>
  );
};
