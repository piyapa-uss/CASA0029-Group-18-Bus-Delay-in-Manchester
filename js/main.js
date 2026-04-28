const rqContent = {
  delay: {
    title: "Where are delays concentrated?",
    text: "We first locate delay hotspots across the bus network to understand where unreliable service is most visible within Greater Manchester."
  },
  reliability: {
    title: "How does reliability vary?",
    text: "We then compare routes, stops, and time periods to examine whether delay is occasional, repeated, or concentrated in specific parts of the network."
  },
  inequality: {
    title: "Where does vulnerability overlap?",
    text: "Finally, we compare delay exposure with socioeconomic context to identify places where unreliable bus service may reinforce uneven access to opportunities."
  }
};

const rqButtons = document.querySelectorAll(".rq-item");
const rqExplanation = document.getElementById("rq-explanation");

rqButtons.forEach((button) => {
  button.addEventListener("click", () => {
    rqButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const key = button.dataset.rq;
    rqExplanation.innerHTML = `
      <h5>${rqContent[key].title}</h5>
      <p>${rqContent[key].text}</p>
    `;
  });
});