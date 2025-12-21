import React from "react";
import { DetailedData } from "@/components/inputs/DetailedData";
import styles from "@/styles/components/Input.module.css";

interface DataDisplayWithClearProps {
  dataToGet: any;
  onClear: () => void;
  marginTop?: string;
  onExecute?: () => void;
}

export const DataDisplayWithClear: React.FC<DataDisplayWithClearProps> = ({
  dataToGet,
  onClear,
  marginTop = "2rem",
  onExecute,
}) => {
  if (!dataToGet) return null;

  return (
    <div style={{ marginTop }}>
      <DetailedData dataToGet={dataToGet} />

      {/* Action buttons */}
      <div style={{ marginTop: "1rem" }}>
        <button className={styles.clearButton} onClick={onClear}>
          Clear
        </button>

        {onExecute && (
          <button className={styles.executeButton} onClick={onExecute}>
            Execute
          </button>
        )}
      </div>
    </div>
  );
};
