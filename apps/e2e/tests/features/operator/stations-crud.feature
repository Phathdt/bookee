@operator-stations
Feature: Operator CMS - Stations CRUD
  As an operator admin
  I want to manage bus stations
  So that I can configure routes between them

  Background:
    Given I am logged in as operator admin

  @priority_high
  Scenario: Admin can navigate to the stations page
    When I navigate to the stations module
    Then I should see the stations page heading

  @priority_high
  Scenario: Admin can create a new station
    When I navigate to the stations module
    And I create a new station with generated data
    Then the new station should appear in the stations table

  @priority_high
  Scenario: Admin can delete a station
    When I navigate to the stations module
    And I create a new station with generated data
    Then the new station should appear in the stations table
    When I delete the new station
    Then the new station should not appear in the stations table
