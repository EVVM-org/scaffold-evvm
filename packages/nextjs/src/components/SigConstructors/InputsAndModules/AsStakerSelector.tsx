import React from "react";

interface AsStakerSelectorProps {
  onAsStakerChange: (asStaker: boolean) => void;
  marginTop?: string;
}

export const AsStakerSelector: React.FC<AsStakerSelectorProps> = ({
  onAsStakerChange,
  marginTop = "1rem",
}) => {
  return (
    <div style={{ marginTop }}>
      <p>Execute as Staker</p>
      <select
        style={{
          color: "black",
          backgroundColor: "white",
          height: "2rem",
          width: "12rem",
        }}
        onChange={(e) => onAsStakerChange(e.target.value === "true")}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    </div>
  );
};
