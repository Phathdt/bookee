@auth @auth-login
Feature: User Authentication - Login
  As a registered Bookee user
  I want to sign in with my credentials
  So that I can manage my trips

  @smoke @priority_high
  Scenario: Successful login after fresh registration
    Given I navigate to the landing page
    When I open the register form
    And I submit a fresh registration
    Then I should see the authenticated profile panel
    When I sign out
    Then I should see the auth form
    When I open the login form
    And I submit my prior credentials
    Then I should see the authenticated profile panel

  @priority_high
  Scenario: Login fails with wrong password
    Given I navigate to the landing page
    When I open the login form
    And I submit invalid credentials
    Then I should see a registration error

  @priority_medium
  Scenario: Login fails when identifier is empty
    Given I navigate to the landing page
    When I open the login form
    And I submit login with empty identifier
    Then I should see a registration error
