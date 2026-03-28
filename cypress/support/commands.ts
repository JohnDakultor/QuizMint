/// <reference types="cypress" />

const DEFAULT_EMAIL = "test@quizmint.ai";
const DEFAULT_PASSWORD = "TestPassword123!";

function getLoginCredentials(email?: string, password?: string) {
  return {
    email: email || Cypress.env("TEST_EMAIL") || DEFAULT_EMAIL,
    password: password || Cypress.env("TEST_PASSWORD") || DEFAULT_PASSWORD,
  };
}

Cypress.Commands.add("login", (email?: string, password?: string) => {
  const creds = getLoginCredentials(email, password);

  cy.session([creds.email], () => {
    cy.request("POST", "/api/test-auth/seed-user", {
      email: creds.email,
      password: creds.password,
    }).its("status").should("eq", 200);

    cy.visit("/sign-in", {
      onBeforeLoad(win) {
        win.localStorage.setItem("cypress-test-mode", "true");
      },
    });
    cy.get("#email").clear().type(creds.email);
    cy.get("#password").clear().type(creds.password, { log: false });
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.contains('button[type="submit"]', "Sign In").click();
    cy.url().should("include", "/home");
  });
});

export {};
