import React from "react";
import styles from "@/components/SigConstructors/SignatureConstructor.module.css";

interface AddressInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
}

export const AddressInputField: React.FC<AddressInputFieldProps> = ({
  label,
  inputId,
  placeholder = "Enter address",
  defaultValue,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>{label}</p>
      <input
        type="text"
        placeholder={placeholder}
        id={inputId}
        className={styles.addressInput}
        defaultValue={defaultValue}
      />
    </div>
  );
};
