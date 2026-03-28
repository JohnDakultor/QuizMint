/// <reference types="cypress" />

describe("Authenticated home page", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/home");
  });

  it("renders the main workspace cards", () => {
    cy.contains("Create Quiz Input").should("be.visible");
    cy.contains("Generated Quiz").should("be.visible");
  });
});
