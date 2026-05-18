@health
Feature: Health Card
  As a visitor to the Bookee landing page
  I want to see the health status card
  So that I know the platform is operational

  @priority_medium
  Scenario: Visitor sees the health card and can refresh it
    Given I navigate to the landing page
    Then the health card should be visible
    When I refresh the health panel
    Then the health card should be visible
