import React from "react";
import styles from "@/styles/components/Input.module.css";

interface ExecutorSelectorProps {
  label?: string;
  inputId: string;
  placeholder?: string;
  onExecutorToggle: (isUsing: boolean) => void;
  isUsingExecutor: boolean;
}

export const ExecutorSelector: React.FC<ExecutorSelectorProps> = ({
  label = "Are you using an executor?",
  inputId,
  placeholder = "Enter executor",
  onExecutorToggle,
  isUsingExecutor,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>{label}</p>
      <select
        className={styles.select}
        style={{ width: "5rem" }}
        onChange={(e) => onExecutorToggle(e.target.value === "true")}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
      {isUsingExecutor && (
        <input
          type="text"
          placeholder={placeholder}
          id={inputId}
          className={styles.textInput}
          style={{ marginLeft: "0.5rem", display: "inline-block" }}
        />
      )}
    </div>
  );
};
