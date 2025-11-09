#!/usr/bin/env node

/**
 * Recipe Analysis Script
 *
 * This script analyzes which recipes can be made with the current inventory
 * Run with: node scripts/analyze-recipes.js
 */

const path = require('path');
const fs = require('fs');

// Mock data for testing - replace with actual API calls when running in production
const getMockInventory = () => [
  { _id: '1', name: 'Vodka', volumeRemaining: 750, volumeTotal: 750, unit: 'ml' },
  { _id: '2', name: 'Lime juice', volumeRemaining: 200, volumeTotal: 500, unit: 'ml' },
  { _id: '3', name: 'Simple syrup', volumeRemaining: 100, volumeTotal: 250, unit: 'ml' },
  { _id: '4', name: 'Gin', volumeRemaining: 500, volumeTotal: 750, unit: 'ml' },
  { _id: '5', name: 'White rum', volumeRemaining: 300, volumeTotal: 750, unit: 'ml' },
  { _id: '6', name: 'Sugar', volumeRemaining: 50, volumeTotal: 500, unit: 'g' },
  { _id: '7', name: 'Mint leaves', volumeRemaining: 20, volumeTotal: 50, unit: 'leaves' },
  { _id: '8', name: 'Soda water', volumeRemaining: 1000, volumeTotal: 1000, unit: 'ml' },
  { _id: '9', name: 'Tequila', volumeRemaining: 600, volumeTotal: 750, unit: 'ml' },
  { _id: '10', name: 'Triple sec', volumeRemaining: 200, volumeTotal: 350, unit: 'ml' },
];

const getMockRecipes = () => [
  {
    _id: 'recipe1',
    name: 'Mojito',
    category: 'Cocktail',
    thumbnailUrl: 'https://example.com/mojito.jpg',
    ingredients: [
      { name: 'White rum', measure: '2 oz' },
      { name: 'Lime juice', measure: '1 oz' },
      { name: 'Sugar', measure: '2 tsp' },
      { name: 'Mint leaves', measure: '6 leaves' },
      { name: 'Soda water', measure: 'Top up' },
    ],
  },
  {
    _id: 'recipe2',
    name: 'Margarita',
    category: 'Cocktail',
    thumbnailUrl: 'https://example.com/margarita.jpg',
    ingredients: [
      { name: 'Tequila', measure: '2 oz' },
      { name: 'Triple sec', measure: '1 oz' },
      { name: 'Lime juice', measure: '1 oz' },
      { name: 'Salt', measure: '1 pinch' },
    ],
  },
  {
    _id: 'recipe3',
    name: 'Old Fashioned',
    category: 'Classic',
    thumbnailUrl: 'https://example.com/old-fashioned.jpg',
    ingredients: [
      { name: 'Bourbon', measure: '2 oz' },
      { name: 'Sugar cube', measure: '1' },
      { name: 'Angostura bitters', measure: '2-3 dashes' },
      { name: 'Orange twist', measure: '1' },
    ],
  },
  {
    _id: 'recipe4',
    name: 'Gin and Tonic',
    category: 'Highball',
    thumbnailUrl: 'https://example.com/gin-tonic.jpg',
    ingredients: [
      { name: 'Gin', measure: '2 oz' },
      { name: 'Tonic water', measure: '4 oz' },
      { name: 'Lime wedge', measure: '1' },
    ],
  },
  {
    _id: 'recipe5',
    name: 'Moscow Mule',
    category: 'Cocktail',
    thumbnailUrl: 'https://example.com/moscow-mule.jpg',
    ingredients: [
      { name: 'Vodka', measure: '2 oz' },
      { name: 'Lime juice', measure: '0.5 oz' },
      { name: 'Ginger beer', measure: '4 oz' },
    ],
  },
];

function analyzeRecipeAvailability(recipes, inventory) {
  return recipes.map((recipe) => {
    const missingIngredients = [];
    const availableIngredients = [];

    recipe.ingredients.forEach((ingredient) => {
      const inventoryItem = inventory.find(
        (item) => item.name?.toLowerCase().trim() === ingredient.name?.toLowerCase().trim(),
      );

      if (inventoryItem) {
        availableIngredients.push(ingredient.name);
      } else {
        missingIngredients.push(ingredient.name);
      }
    });

    const totalIngredients = recipe.ingredients.length;
    const missingCount = missingIngredients.length;
    const percentageAvailable =
      totalIngredients > 0
        ? Math.round(((totalIngredients - missingCount) / totalIngredients) * 100)
        : 0;

    let availability;
    if (missingCount === 0) {
      availability = 'full';
    } else if (missingCount < totalIngredients) {
      availability = 'partial';
    } else {
      availability = 'none';
    }

    return {
      recipe,
      availability,
      missingIngredients,
      availableIngredients,
      missingCount,
      totalIngredients,
      percentageAvailable,
    };
  });
}

function generateReport() {
  console.log('🍹 Recipe Availability Analysis');
  console.log('================================');

  const inventory = getMockInventory();
  const recipes = getMockRecipes();

  console.log(`📦 Inventory Items: ${inventory.length}`);
  console.log(`📜 Total Recipes: ${recipes.length}`);
  console.log('');

  const analysis = analyzeRecipeAvailability(recipes, inventory);

  const fullyMakeable = analysis.filter((a) => a.availability === 'full');
  const partiallyMakeable = analysis.filter((a) => a.availability === 'partial');
  const notMakeable = analysis.filter((a) => a.availability === 'none');

  console.log('📊 SUMMARY:');
  console.log(`✅ Can make fully: ${fullyMakeable.length} recipes`);
  console.log(`⚠️  Can make partially: ${partiallyMakeable.length} recipes`);
  console.log(`❌ Cannot make: ${notMakeable.length} recipes`);
  console.log('');

  if (fullyMakeable.length > 0) {
    console.log('🎉 RECIPES YOU CAN MAKE RIGHT NOW:');
    fullyMakeable.forEach((item) => {
      console.log(`  ✅ ${item.recipe.name} (${item.recipe.category})`);
    });
    console.log('');
  }

  if (partiallyMakeable.length > 0) {
    console.log('🔄 RECIPES YOU CAN PARTIALLY MAKE:');
    partiallyMakeable.forEach((item) => {
      console.log(`  ⚠️  ${item.recipe.name} (${item.percentageAvailable}% available)`);
      console.log(`     Missing: ${item.missingIngredients.join(', ')}`);
    });
    console.log('');
  }

  if (notMakeable.length > 0) {
    console.log('❌ RECIPES YOU CANNOT MAKE:');
    notMakeable.forEach((item) => {
      console.log(`  ❌ ${item.recipe.name}`);
      console.log(`     Need: ${item.missingIngredients.join(', ')}`);
    });
    console.log('');
  }

  // Sort by makeability
  const sortedByMakeability = [...analysis].sort((a, b) => {
    const availabilityOrder = { full: 3, partial: 2, none: 1 };
    const aDiff = availabilityOrder[a.availability];
    const bDiff = availabilityOrder[b.availability];

    if (aDiff !== bDiff) {
      return bDiff - aDiff;
    }

    return b.percentageAvailable - a.percentageAvailable;
  });

  console.log('📋 DETAILED ANALYSIS (by makeability):');
  sortedByMakeability.forEach((item) => {
    const status =
      item.availability === 'full' ? '✅' : item.availability === 'partial' ? '⚠️' : '❌';
    console.log(
      `  ${status} ${item.recipe.name} - ${item.percentageAvailable}% (${item.availableIngredients.length}/${item.totalIngredients} ingredients)`,
    );
  });
}

// Run the analysis
generateReport();
