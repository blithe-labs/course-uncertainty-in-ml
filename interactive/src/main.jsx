import React from "react";
import { createRoot } from "react-dom/client";

function CoverageDemo() {
  return (
    <div>
      <h3>Conformal Coverage Demo</h3>
      <p>Interactive demo goes here.</p>
    </div>
  );
}

const el = document.getElementById("coverage-demo");
if (el) {
  createRoot(el).render(<CoverageDemo />);
}