import React from "react";
import styles from "@/styles/components/Input.module.css";

interface StakingActionSelectorProps {
  onChange: (isStaking: boolean) => void;
  defaultValue?: boolean;
}

export const StakingActionSelector: React.FC<StakingActionSelectorProps> = ({
  onChange,
  defaultValue = true,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        Action:{" "}
        <select
          onChange={(e) => onChange(e.target.value === "true")}
          defaultValue={defaultValue.toString()}
          className={styles.select}
          style={{ width: "5rem" }}
        >
          <option value="true">Staking</option>
          <option value="false">Unstaking</option>
        </select>
      </label>
    </div>
  );
};
