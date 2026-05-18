@operator-vehicles
Feature: Operator CMS - Vehicles CRUD
  As an operator admin
  I want to manage the vehicle fleet
  So that I can assign vehicles to trips

  Background:
    Given I am logged in as operator admin

  @priority_high
  Scenario: Admin can create a vehicle and delete it
    When I navigate to the vehicles module
    And I create a new vehicle with generated data
    Then the new vehicle should appear in the vehicles table
    When I delete the new vehicle
    Then the new vehicle should not appear in the vehicles table

  @priority_medium
  Scenario: Admin can edit a vehicle — change plate and total seats
    When I navigate to the vehicles module
    And I create a new vehicle with generated data
    Then the new vehicle should appear in the vehicles table
    When I edit the new vehicle plate to "E2E-EDT001" and total seats to 40
    Then the vehicle "E2E-EDT001" should appear in the vehicles table
    When I delete the edited vehicle
    Then the vehicle "E2E-EDT001" should not appear in the vehicles table
