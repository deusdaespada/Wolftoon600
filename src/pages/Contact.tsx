import { useEffect } from "react";

const Contact = () => {
  useEffect(() => {
    window.location.href = "https://discord.gg/6wUg8wssQv";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando para o Discord...</p>
    </div>
  );
};

export default Contact;