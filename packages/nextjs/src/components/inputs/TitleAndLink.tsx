"use client";

export const TitleAndLink = ({ title , link }: { title: string; link: string }) => {
  return (
    <>
    <h1>{title}</h1>
      <h3 style={{ textAlign: "center", color: "#3A9EE3" }}>
        <a href={link} target="_blank" rel="noopener noreferrer">
          Learn more about {title.toLocaleLowerCase()} signature structure here
        </a>
      </h3>
    </>
  );
};
