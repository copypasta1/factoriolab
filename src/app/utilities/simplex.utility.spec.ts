import { ItemId, Mocks, RecipeId } from 'src/tests';
import { Rational, RationalRecipe, Step } from '~/models';
import { RateUtility } from './rate.utility';
import {
  SimplexUtility,
  MatrixState,
  COST_RECIPE,
  COST_WATER,
  COST_MINED,
  COST_MANUAL,
} from './simplex.utility';

describe('SimplexUtility', () => {
  const getState = (): MatrixState => ({
    recipes: {},
    items: {},
    recipeIds: Mocks.Data.recipeIds,
    itemIds: Mocks.Data.itemIds,
    data: Mocks.AdjustedData,
  });
  /** https://en.wikipedia.org/wiki/Simplex_algorithm#Example */
  const getTableau = (): Rational[][] => [
    [
      Rational.one,
      Rational.from(-2),
      Rational.from(-3),
      Rational.from(-4),
      Rational.zero,
      Rational.zero,
      Rational.zero,
    ],
    [
      Rational.zero,
      Rational.from(3),
      Rational.from(2),
      Rational.one,
      Rational.one,
      Rational.zero,
      Rational.from(10),
    ],
    [
      Rational.zero,
      Rational.from(2),
      Rational.from(5),
      Rational.from(3),
      Rational.zero,
      Rational.one,
      Rational.from(15),
    ],
  ];
  const getSolution = (): Rational[][] => [
    [
      Rational.one,
      Rational.from(2, 3),
      Rational.from(11, 3),
      Rational.zero,
      Rational.zero,
      Rational.from(4, 3),
      Rational.from(20),
    ],
    [
      Rational.zero,
      Rational.from(7, 3),
      Rational.from(1, 3),
      Rational.zero,
      Rational.one,
      Rational.from(-1, 3),
      Rational.from(5),
    ],
    [
      Rational.zero,
      Rational.from(2, 3),
      Rational.from(5, 3),
      Rational.one,
      Rational.zero,
      Rational.from(1, 3),
      Rational.from(5),
    ],
  ];

  describe('solve', () => {
    it('should handle empty list of steps', () => {
      expect(SimplexUtility.solve([], null, null, null)).toEqual([]);
    });

    it('should handle fully solved steps', () => {
      spyOn(SimplexUtility, 'getState').and.returnValue(null);
      expect(SimplexUtility.solve(Mocks.Steps, null, null, null)).toEqual(
        Mocks.Steps
      );
    });

    it('should handle failure of simplex method', () => {
      spyOn(SimplexUtility, 'getState').and.returnValue(true as any);
      spyOn(SimplexUtility, 'getSolution').and.returnValue(null);
      spyOn(console, 'error');
      expect(SimplexUtility.solve(Mocks.Steps, null, null, null)).toEqual(
        Mocks.Steps
      );
      expect(console.error).toHaveBeenCalled();
    });

    it('should update steps with solution from simplex method', () => {
      spyOn(SimplexUtility, 'getState').and.returnValue(true as any);
      spyOn(SimplexUtility, 'getSolution').and.returnValue(true as any);
      spyOn(SimplexUtility, 'updateSteps');
      expect(SimplexUtility.solve(Mocks.Steps, null, null, null)).toEqual(
        Mocks.Steps
      );
      expect(SimplexUtility.updateSteps).toHaveBeenCalledWith(
        Mocks.Steps,
        true as any,
        true as any
      );
    });
  });

  describe('getState', () => {
    it('should return null for fully solved steps', () => {
      spyOn(SimplexUtility, 'unsolvedSteps').and.returnValue([]);
      expect(
        SimplexUtility.getState(
          Mocks.Steps,
          Mocks.ItemSettingsInitial,
          [],
          Mocks.Data
        )
      ).toBeNull();
    });

    it('should parse unsolved steps', () => {
      const id = 'id';
      const step: any = { itemId: id, items: Rational.one };
      spyOn(SimplexUtility, 'unsolvedSteps').and.returnValue([step]);
      spyOn(SimplexUtility, 'parseItemRecursively');
      const result = SimplexUtility.getState(
        Mocks.Steps,
        Mocks.ItemSettingsInitial,
        [],
        Mocks.Data
      );
      expect(SimplexUtility.parseItemRecursively).toHaveBeenCalledTimes(1);
      expect(result.items[id]).toEqual(Rational.one);
    });

    it('should build full state object', () => {
      spyOn(SimplexUtility, 'unsolvedSteps').and.returnValue([Mocks.Step1]);
      spyOn(SimplexUtility, 'parseItemRecursively');
      const result = SimplexUtility.getState(
        Mocks.Steps,
        Mocks.ItemSettingsInitial,
        [],
        Mocks.Data
      );
      expect(SimplexUtility.parseItemRecursively).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        recipes: {},
        items: { [Mocks.Step1.itemId]: Mocks.Step1.items },
        recipeIds: Mocks.Data.recipeIds,
        itemIds: Mocks.Data.itemIds,
        data: Mocks.Data,
      });
    });
  });

  describe('unsolvedSteps', () => {
    const control: any = {
      itemId: ItemId.Coal,
    };

    it('should filter for steps that have no recipe', () => {
      const filter: any = {
        itemId: ItemId.Coal,
        recipeId: RecipeId.Coal,
      };
      const steps = [control, filter];
      const result = SimplexUtility.unsolvedSteps(steps, getState());
      expect(result).toEqual([control]);
    });

    it('should filter for steps that match an item', () => {
      const filter: any = {
        itemId: 'itemId',
      };
      const steps = [control, filter];
      const result = SimplexUtility.unsolvedSteps(steps, getState());
      expect(result).toEqual([control]);
    });

    it('should filter for steps that match a recipe id', () => {
      const filter: any = {
        itemId: ItemId.IronOre,
      };
      const state = getState();
      state.recipeIds = [RecipeId.Coal];
      const steps = [control, filter];
      const result = SimplexUtility.unsolvedSteps(steps, state);
      expect(result).toEqual([control]);
    });
  });

  describe('recipeMatches', () => {
    it('should find matching recipes for an item', () => {
      const state = getState();
      const recipe = Mocks.AdjustedData.recipeR[RecipeId.Coal];
      const result = SimplexUtility.recipeMatches(ItemId.Coal, state);
      expect(state.recipes).toEqual({ [RecipeId.Coal]: recipe });
      expect(result).toEqual([recipe]);
    });
  });

  describe('itemMatches', () => {
    it('should find matching items for a recipe', () => {
      const state = getState();
      const recipe = Mocks.AdjustedData.recipeR[RecipeId.CopperCable];
      const result = SimplexUtility.itemMatches(recipe, state);
      expect(state.items).toEqual({
        [ItemId.CopperCable]: Rational.zero,
        [ItemId.CopperPlate]: Rational.zero,
      });
      expect(state.recipes).toEqual({});
      expect(result).toEqual([ItemId.CopperPlate]);
    });

    it('should create a fake recipe for items that are ignored', () => {
      const state = getState();
      const recipe = Mocks.AdjustedData.recipeR[RecipeId.WoodenChest];
      const result = SimplexUtility.itemMatches(recipe, state);
      expect(state.items).toEqual({
        [ItemId.Wood]: Rational.zero,
        [ItemId.WoodenChest]: Rational.zero,
      });
      expect(state.recipes).toEqual({
        [ItemId.Wood]: new RationalRecipe({
          id: null,
          time: 0,
          out: { [ItemId.Wood]: 1 },
          producers: [],
        }),
      });
      expect(result).toEqual([ItemId.Wood]);
    });
  });

  describe('parseRecipeRecursively', () => {
    it('should do nothing for recipes with no inputs', () => {
      spyOn(SimplexUtility, 'parseItemRecursively');
      SimplexUtility.parseRecipeRecursively(
        Mocks.AdjustedData.recipeR[RecipeId.IronOre],
        null
      );
      expect(SimplexUtility.parseItemRecursively).not.toHaveBeenCalled();
    });

    it('should parse recipe inputs recursively', () => {
      spyOn(SimplexUtility, 'itemMatches').and.returnValue([
        ItemId.CopperPlate,
      ]);
      spyOn(SimplexUtility, 'parseItemRecursively');
      const recipe = Mocks.AdjustedData.recipeR[RecipeId.CopperCable];
      const state = getState();
      SimplexUtility.parseRecipeRecursively(recipe, state);
      expect(SimplexUtility.itemMatches).toHaveBeenCalledWith(recipe, state);
      expect(SimplexUtility.parseItemRecursively).toHaveBeenCalledWith(
        ItemId.CopperPlate,
        state
      );
    });
  });

  describe('parseItemRecursively', () => {
    it('should do nothing for simple recipe that was already parsed', () => {
      spyOn(SimplexUtility, 'parseRecipeRecursively');
      const state = getState();
      state.recipes[RecipeId.CopperCable] =
        Mocks.AdjustedData.recipeR[RecipeId.CopperCable];
      SimplexUtility.parseItemRecursively(ItemId.CopperCable, state);
      expect(SimplexUtility.parseRecipeRecursively).not.toHaveBeenCalled();
    });

    it('should parse a simple recipe', () => {
      spyOn(SimplexUtility, 'parseRecipeRecursively');
      const state = getState();
      SimplexUtility.parseItemRecursively(ItemId.CopperCable, state);
      expect(SimplexUtility.parseRecipeRecursively).toHaveBeenCalledWith(
        Mocks.AdjustedData.recipeR[RecipeId.CopperCable],
        state
      );
    });

    it('should get complex recipe matches and parse them', () => {
      const recipe = Mocks.AdjustedData.recipeR[RecipeId.AdvancedOilProcessing];
      spyOn(SimplexUtility, 'recipeMatches').and.returnValue([recipe]);
      spyOn(SimplexUtility, 'parseRecipeRecursively');
      const state = getState();
      SimplexUtility.parseItemRecursively(ItemId.PetroleumGas, state);
      expect(SimplexUtility.recipeMatches).toHaveBeenCalledWith(
        ItemId.PetroleumGas,
        state
      );
      expect(SimplexUtility.parseRecipeRecursively).toHaveBeenCalledWith(
        recipe,
        state
      );
    });
  });

  describe('getSolution', () => {
    it('should handle no solution found by simplex', () => {
      spyOn(SimplexUtility, 'canonical').and.returnValue('A' as any);
      spyOn(SimplexUtility, 'simplex').and.returnValue(null);
      spyOn(SimplexUtility, 'parseSolution');
      const state = getState();
      const result = SimplexUtility.getSolution(state);
      expect(SimplexUtility.canonical).toHaveBeenCalledWith(state);
      expect(SimplexUtility.simplex).toHaveBeenCalledWith('A' as any);
      expect(SimplexUtility.parseSolution).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should parse the solution found by simplex', () => {
      spyOn(SimplexUtility, 'canonical').and.returnValue('A' as any);
      spyOn(SimplexUtility, 'simplex').and.returnValue('B' as any);
      spyOn(SimplexUtility, 'parseSolution').and.returnValue('C' as any);
      const state = getState();
      const result = SimplexUtility.getSolution(state);
      expect(SimplexUtility.canonical).toHaveBeenCalledWith(state);
      expect(SimplexUtility.simplex).toHaveBeenCalledWith('A' as any);
      expect(SimplexUtility.parseSolution).toHaveBeenCalledWith(
        'A' as any,
        state
      );
      expect(result).toEqual('C' as any);
    });
  });

  describe('canonical', () => {
    it('should get a canonical matrix', () => {
      const state = getState();
      state.recipes[RecipeId.CopperCable] =
        Mocks.AdjustedData.recipeR[RecipeId.CopperCable];
      state.recipes[ItemId.CopperPlate] = new RationalRecipe({
        id: null,
        time: 1,
        out: { [ItemId.CopperPlate]: 1 },
        producers: [],
      });
      state.recipes[ItemId.Water] = Mocks.AdjustedData.recipeR[RecipeId.Water];
      state.recipes[ItemId.IronOre] =
        Mocks.AdjustedData.recipeR[RecipeId.IronOre];
      state.items[ItemId.CopperCable] = Rational.one;
      state.items[ItemId.CopperPlate] = Rational.zero;
      const result = SimplexUtility.canonical(state);
      expect(result).toEqual([
        [
          Rational.one,
          Rational.minusOne,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
        ],
        [
          Rational.zero,
          Rational.two,
          Rational.minusOne,
          Rational.one,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          COST_RECIPE,
        ],
        [
          Rational.zero,
          Rational.zero,
          Rational.one,
          Rational.zero,
          Rational.one,
          Rational.zero,
          Rational.zero,
          COST_MANUAL,
        ],
        [
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.one,
          Rational.zero,
          COST_WATER,
        ],
        [
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.zero,
          Rational.one,
          COST_MINED,
        ],
      ]);
    });
  });

  describe('simplex', () => {
    it('should solve a canonical tableau', () => {
      const A = getTableau();
      const result = SimplexUtility.simplex(A);
      expect(A).toEqual(getSolution());
      expect(result).toBeTrue();
    });

    it('should handle a failed pivot', () => {
      spyOn(SimplexUtility, 'pivotCol').and.returnValue(false);
      expect(SimplexUtility.simplex(getTableau())).toBeFalse();
    });
  });

  describe('pivotCol', () => {
    it('should pivot the correct row', () => {
      spyOn(SimplexUtility, 'pivot');
      const A = getTableau();
      SimplexUtility.pivotCol(A, 3);
      expect(SimplexUtility.pivot).toHaveBeenCalledWith(A, 3, 2);
    });

    it('should handle no positive rows', () => {
      spyOn(SimplexUtility, 'pivot');
      const A = getTableau();
      const result = SimplexUtility.pivotCol(A, 0);
      expect(SimplexUtility.pivot).not.toHaveBeenCalled();
      expect(result).toBeFalse();
    });

    it('should pivot the first correct row', () => {
      spyOn(SimplexUtility, 'pivot');
      const A = getTableau();
      SimplexUtility.pivotCol(A, 1);
      expect(SimplexUtility.pivot).toHaveBeenCalledWith(A, 1, 1);
    });
  });

  describe('pivot', () => {
    it('should pivot a column', () => {
      const A = getTableau();
      const result = SimplexUtility.pivot(A, 3, 2);
      expect(A).toEqual(getSolution());
      expect(result).toBeTrue();
    });
  });

  describe('parseSolution', () => {
    it('should parse the solution of the tableau', () => {
      const state = getState();
      state.items[ItemId.Coal] = Rational.zero;
      state.items[ItemId.IronOre] = Rational.zero;
      state.recipes[RecipeId.Coal] = Mocks.AdjustedData.recipeR[RecipeId.Coal];
      state.recipes[ItemId.Wood] = { id: null } as any;
      state.recipes[RecipeId.IronOre] =
        Mocks.AdjustedData.recipeR[RecipeId.IronOre];
      const O = [
        Rational.one,
        Rational.zero,
        Rational.one,
        Rational.zero,
        Rational.one,
        Rational.two,
        Rational.zero,
      ];
      const result = SimplexUtility.parseSolution([O], state);
      expect(result).toEqual({
        surplus: { [ItemId.IronOre]: Rational.one },
        inputs: { [ItemId.Wood]: Rational.one },
        recipes: { [RecipeId.IronOre]: Rational.two },
      });
    });
  });

  describe('updateSteps', () => {
    it('should walk through and update steps based on simplex result', () => {
      spyOn(SimplexUtility, 'addItemStep');
      spyOn(SimplexUtility, 'assignRecipes');
      spyOn(SimplexUtility, 'addRecipeStep');
      spyOn(SimplexUtility, 'updateParents');
      const state = getState();
      state.items[ItemId.Coal] = Rational.zero;
      state.items[ItemId.IronOre] = Rational.zero;
      state.recipes[RecipeId.Coal] = Mocks.AdjustedData.recipeR[RecipeId.Coal];
      state.recipes[ItemId.Wood] = { id: null } as any;
      state.recipes[RecipeId.IronOre] =
        Mocks.AdjustedData.recipeR[RecipeId.IronOre];
      const solution = {
        surplus: { [ItemId.IronOre]: Rational.one },
        inputs: { [ItemId.Wood]: Rational.one },
        recipes: { [RecipeId.IronOre]: Rational.two },
      };
      SimplexUtility.updateSteps(Mocks.Steps, solution, state);
      expect(SimplexUtility.addItemStep).toHaveBeenCalledTimes(2);
      expect(SimplexUtility.assignRecipes).toHaveBeenCalledTimes(1);
      expect(SimplexUtility.addRecipeStep).toHaveBeenCalledTimes(1);
      expect(SimplexUtility.updateParents).toHaveBeenCalledTimes(1);
    });
  });

  describe('addItemStep', () => {
    it('should update an existing step with items', () => {
      const step: Step = {
        itemId: ItemId.Coal,
        items: Rational.one,
        depth: 0,
      };
      const solution = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: Rational.two },
      };
      const state = getState();
      state.items[ItemId.Coal] = Rational.from(3);
      state.recipes[RecipeId.Coal] = Mocks.AdjustedData.recipeR[RecipeId.Coal];
      SimplexUtility.addItemStep(ItemId.Coal, [step], 1, solution, state);
      expect(step).toEqual({
        itemId: ItemId.Coal,
        items: Rational.two,
        depth: 1,
      });
    });

    it('should add to an input step', () => {
      const step: Step = {
        itemId: ItemId.Coal,
        items: Rational.one,
        depth: 0,
      };
      const solution = {
        surplus: {},
        inputs: { [ItemId.Coal]: Rational.two },
        recipes: {},
      };
      const state = getState();
      state.items[ItemId.Coal] = Rational.zero;
      state.recipes[ItemId.Coal] = new RationalRecipe({
        id: null,
        time: 1,
        out: { [ItemId.Coal]: 1 },
        producers: [],
      });
      SimplexUtility.addItemStep(ItemId.Coal, [step], 1, solution, state);
      expect(step).toEqual({
        itemId: ItemId.Coal,
        items: Rational.from(3),
        depth: 1,
      });
    });

    it('should ignore an item with no output', () => {
      const step: Step = {
        itemId: ItemId.Coal,
        items: Rational.one,
        depth: 0,
      };
      const solution = {
        surplus: { [ItemId.Coal]: Rational.zero },
        inputs: { [ItemId.Coal]: Rational.zero },
        recipes: { [RecipeId.Coal]: Rational.zero },
      };
      const state = getState();
      state.items[ItemId.Coal] = Rational.one;
      state.recipes[ItemId.Coal] = Mocks.AdjustedData.recipeR[RecipeId.Coal];
      SimplexUtility.addItemStep(ItemId.Coal, [step], 1, solution, state);
      expect(step).toEqual({
        itemId: ItemId.Coal,
        items: Rational.one,
        depth: 0,
      });
    });

    it('should add a new step', () => {
      const steps: Step[] = [];
      const solution = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: Rational.two },
      };
      const state = getState();
      state.items[ItemId.Coal] = Rational.from(3);
      state.recipes[RecipeId.Coal] = Mocks.AdjustedData.recipeR[RecipeId.Coal];
      SimplexUtility.addItemStep(ItemId.Coal, steps, 1, solution, state);
      expect(steps).toEqual([
        {
          itemId: ItemId.Coal,
          items: Rational.two,
          depth: 1,
        },
      ]);
    });

    it('should place a new step next to related steps', () => {
      const steps: Step[] = [
        { itemId: ItemId.PetroleumGas, items: Rational.zero, depth: 0 },
        { itemId: ItemId.Wood, items: Rational.zero, depth: 0 },
      ];
      const solution = {
        surplus: {},
        inputs: { [ItemId.HeavyOil]: Rational.one },
        recipes: {},
      };
      const state = getState();
      state.recipes[RecipeId.AdvancedOilProcessing] =
        Mocks.AdjustedData.recipeR[RecipeId.AdvancedOilProcessing];
      SimplexUtility.addItemStep(ItemId.HeavyOil, steps, 1, solution, state);
      expect(steps).toEqual([
        { itemId: ItemId.PetroleumGas, items: Rational.zero, depth: 0 },
        { itemId: ItemId.HeavyOil, items: Rational.one, depth: 1 },
        { itemId: ItemId.Wood, items: Rational.zero, depth: 0 },
      ]);
    });

    it('should assign a surplus value', () => {
      const step: Step = {
        itemId: ItemId.Coal,
        items: Rational.zero,
        depth: 0,
      };
      const solution = {
        surplus: { [ItemId.Coal]: Rational.from(3) },
        inputs: {},
        recipes: { [RecipeId.Coal]: Rational.from(4) },
      };
      const state = getState();
      state.items[ItemId.Coal] = Rational.zero;
      state.recipes[RecipeId.Coal] = Mocks.AdjustedData.recipeR[RecipeId.Coal];
      SimplexUtility.addItemStep(ItemId.Coal, [step], 1, solution, state);
      expect(step).toEqual({
        itemId: ItemId.Coal,
        items: Rational.one,
        surplus: Rational.from(3),
        depth: 1,
      });
    });
  });

  describe('assignRecipes', () => {
    it('should assign recipes to appropriate steps', () => {
      const steps: Step[] = [
        {
          itemId: ItemId.HeavyOil,
          items: Rational.zero,
          depth: 0,
        },
        {
          itemId: ItemId.PetroleumGas,
          items: Rational.zero,
          depth: 0,
        },
      ];
      const solution = {
        surplus: {},
        inputs: {},
        recipes: {
          [RecipeId.AdvancedOilProcessing]: Rational.one,
          [RecipeId.BasicOilProcessing]: Rational.one,
        },
      };
      const state = getState();
      state.recipes[RecipeId.AdvancedOilProcessing] =
        Mocks.AdjustedData.recipeR[RecipeId.AdvancedOilProcessing];
      state.recipes[RecipeId.BasicOilProcessing] =
        Mocks.AdjustedData.recipeR[RecipeId.BasicOilProcessing];
      SimplexUtility.assignRecipes(steps, solution, state);
      expect(steps).toEqual([
        {
          itemId: ItemId.HeavyOil,
          recipeId: RecipeId.AdvancedOilProcessing,
          items: Rational.zero,
          depth: 0,
        },
        {
          itemId: ItemId.PetroleumGas,
          recipeId: RecipeId.BasicOilProcessing,
          items: Rational.zero,
          depth: 0,
        },
      ]);
    });
  });

  describe('addRecipeStep', () => {
    it('should update an existing step', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const step: Step = {
        itemId: ItemId.Coal,
        items: Rational.one,
        depth: 0,
      };
      const solution = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: Rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedData.recipeR[RecipeId.Coal],
        [step],
        1,
        solution
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(step).toEqual({
        itemId: ItemId.Coal,
        recipeId: RecipeId.Coal,
        items: Rational.one,
        factories: Rational.from(4, 3),
        depth: 1,
      });
    });

    it('should find a matching step by recipe existing step', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const step: Step = {
        itemId: null,
        recipeId: RecipeId.Coal,
        items: Rational.one,
        depth: 0,
      };
      const solution = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: Rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedData.recipeR[RecipeId.Coal],
        [step],
        1,
        solution
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(step).toEqual({
        itemId: null,
        recipeId: RecipeId.Coal,
        items: Rational.one,
        factories: Rational.from(4, 3),
        depth: 1,
      });
    });

    it('should add a new step', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const steps: Step[] = [];
      const solution = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: Rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedData.recipeR[RecipeId.Coal],
        steps,
        1,
        solution
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(steps).toEqual([
        {
          itemId: null,
          items: null,
          recipeId: RecipeId.Coal,
          factories: Rational.from(4, 3),
          depth: 1,
        },
      ]);
    });

    it('should place a new step next to related steps', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const steps: Step[] = [
        {
          itemId: ItemId.PetroleumGas,
          recipeId: RecipeId.BasicOilProcessing,
          items: Rational.zero,
          depth: 0,
        },
        { itemId: ItemId.Wood, items: Rational.zero, depth: 0 },
      ];
      const solution = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.AdvancedOilProcessing]: Rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedData.recipeR[RecipeId.AdvancedOilProcessing],
        steps,
        1,
        solution
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(steps).toEqual([
        {
          itemId: ItemId.PetroleumGas,
          recipeId: RecipeId.BasicOilProcessing,
          items: Rational.zero,
          depth: 0,
        },
        {
          itemId: null,
          items: null,
          recipeId: RecipeId.AdvancedOilProcessing,
          factories: Rational.from(20, 3),
          depth: 1,
        },
        { itemId: ItemId.Wood, items: Rational.zero, depth: 0 },
      ]);
    });
  });

  describe('updateParents', () => {
    it('should update parents for steps solved by matrix', () => {
      spyOn(RateUtility, 'addParentValue');
      const step: Step = {
        itemId: ItemId.Coal,
        items: Rational.one,
        depth: 0,
      };
      const solution = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.PlasticBar]: Rational.one },
      };
      const state = getState();
      state.recipes[RecipeId.PlasticBar] =
        Mocks.AdjustedData.recipeR[RecipeId.PlasticBar];
      SimplexUtility.updateParents([step], solution, state);
      expect(RateUtility.addParentValue).toHaveBeenCalledWith(
        step,
        RecipeId.PlasticBar,
        Rational.one
      );
    });
  });
});