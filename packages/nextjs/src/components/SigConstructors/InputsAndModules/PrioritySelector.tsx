import React from "react";

interface PrioritySelectorProps {
  onPriorityChange: (priority: string) => void;
  marginTop?: string;
}

/**
	* Offers two priority types of execution: sync (low) and async (high)
*/
export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  onPriorityChange,
  marginTop = "1rem",
}) => {
  return (
    <div style={{ marginTop }}>
      <p>EVVM Nonce Type</p>
      <select
        style={{
          color: "black",
          backgroundColor: "white",
          height: "2rem",
          width: "12rem",
        }}
        onChange={(e) => onPriorityChange(e.target.value)}
      >
        <option value="low">synchronous nonce</option>
        <option value="high">asynchronous nonce</option>
      </select>
    </div>
  );
};
