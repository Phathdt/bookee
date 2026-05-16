@auth @auth-register
Feature: User Registration
  As a new visitor
  I want to create a Bookee account
  So that I can book trips

  @smoke @priority_high
  Scenario: Successful registration with fresh credentials
    Given I navigate to the landing page
    When I open the register form
    And I submit a fresh registration
    Then I should see the authenticated profile panel

  @priority_high
  Scenario: Registration fails with duplicate email
    Given I navigate to the landing page
    When I open the register form
    And I register with a known taken email
    Then I should see a registration error
