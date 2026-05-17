@smoke @operator-auth
Feature: Operator CMS - Login
  As an operator admin
  I want to sign in to the CMS with my credentials
  So that I can manage routes, vehicles and trips

  @smoke @priority_high
  Scenario: Admin can log in with seeded credentials
    Given I navigate to the operator login page
    When I submit operator credentials "0900000000" and password "admin"
    Then I should be redirected to the operator dashboard

  @priority_high
  Scenario: Login fails with wrong password
    Given I navigate to the operator login page
    When I submit operator credentials "0900000000" and password "wrongpass"
    Then I should see an operator login error
