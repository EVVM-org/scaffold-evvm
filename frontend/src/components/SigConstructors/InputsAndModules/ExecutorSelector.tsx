import React from "react";

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
        style={{
          color: "black",
          backgroundColor: "white",
          height: "2rem",
          width: "5rem",
        }}
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
          style={{
            color: "black",
            backgroundColor: "white",
            height: "2rem",
            width: "25rem",
          }}
        />
      )}
    </div>
  );
};
