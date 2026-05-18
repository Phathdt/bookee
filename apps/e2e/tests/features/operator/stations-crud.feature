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

  @priority_medium
  Scenario: Admin can edit a station — change city and lat
    When I navigate to the stations module
    And I create a new station with generated data
    Then the new station should appear in the stations table
    When I edit the new station with city "EditedCity" and lat 15.5
    Then the station city "EditedCity" should be visible in the table
    When I delete the new station
    Then the new station should not appear in the stations table

  @priority_medium
  Scenario: Admin can filter stations via the search input
    When I navigate to the stations module
    And I search stations for "Miền Đông"
    Then the station "Miền Đông" should be visible in results
    And the station "Miền Tây" should not be visible in results

  @priority_low
  Scenario: Create station rejects out-of-range latitude
    When I navigate to the stations module
    And I attempt to create a station with lat 999
    Then the station form should show a validation error
