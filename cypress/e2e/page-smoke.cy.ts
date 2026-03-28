/// <reference types="cypress" />

describe("Public page smoke", () => {
  const publicPages = [
    { path: "/", text: "AI Quiz & Lesson Plan Generator" },
    { path: "/about", text: "About QuizMintAI" },
    { path: "/sign-in", text: "Welcome Back" },
    { path: "/sign-up", text: "Create an Account" },
  ];

  publicPages.forEach((page) => {
    it(`renders ${page.path}`, () => {
      cy.visit(page.path);
      cy.contains(page.text).should("be.visible");
    });
  });
});

describe("Authenticated page smoke", () => {
  beforeEach(() => {
    cy.login();
  });

  const protectedPages = [
    { path: "/home", text: "Dashboard" },
    { path: "/generate-quiz", text: "Create Quiz Input" },
    { path: "/lessonPlan", text: "Lesson Plan Generator" },
    { path: "/support", text: "Contact Us" },
  ];

  protectedPages.forEach((page) => {
    it(`renders ${page.path}`, () => {
      cy.visit(page.path);
      cy.contains(page.text).should("be.visible");
    });
  });
});
