import React from "react";
import mersenneTwister from "@/utils/mersenneTwister";
import styles from "@/styles/components/Input.module.css";

interface NumberInputWithGeneratorProps {
  label: string;
  inputId: string;
  placeholder?: string;
  buttonText?: string;
  showRandomBtn?: boolean;
}

export const NumberInputWithGenerator: React.FC<
  NumberInputWithGeneratorProps
> = ({
  label,
  inputId,
  placeholder = "Enter number",
  buttonText = `Generate Random ${label}`,
  showRandomBtn = true,
}) => {
  const generateRandomNumber = () => {
    const seed = Math.floor(Math.random() + Date.now());
    const mt = mersenneTwister(seed);
    const number = mt.int32();
    (document.getElementById(inputId) as HTMLInputElement).value =
      number.toString();
  };

  return (
    <div style={{ marginBottom: "1rem", marginTop: "1rem" }}>
      <p>
        {label}:{" "}

        {showRandomBtn && (
          <button
            className={styles.numberWithGeneratorButton}
            onClick={generateRandomNumber}
          >
            {buttonText}
          </button>
        )}
        <input
            type="number"
            placeholder={placeholder}
            id={inputId}
            className={styles.numberWithGeneratorInput}
          />
      </p>
    </div>
  );
};
