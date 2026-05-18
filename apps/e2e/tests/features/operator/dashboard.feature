@operator-dashboard
Feature: Operator CMS - Dashboard
  As an operator admin
  I want to see an overview dashboard
  So that I can quickly navigate to each module

  Background:
    Given I am logged in as operator admin

  @priority_high
  Scenario: Admin sees all expected dashboard cards
    Then I should see all dashboard overview cards

  @priority_medium
  Scenario: Admin clicks the Stations card and navigates to stations
    When I click the dashboard card "stations"
    Then I should be on the stations page
