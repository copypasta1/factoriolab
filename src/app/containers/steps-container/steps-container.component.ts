import {
  Component,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { Step, RecipeId, ItemId, DisplayRate } from '~/models';
import { State } from '~/store';
import * as Dataset from '~/store/dataset';
import * as Recipe from '~/store/recipe';
import * as Products from '~/store/products';
import * as Settings from '~/store/settings';
import { StepsComponent } from './steps/steps.component';

@Component({
  selector: 'lab-steps-container',
  templateUrl: './steps-container.component.html',
  styleUrls: ['./steps-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepsContainerComponent implements OnInit {
  @ViewChild(StepsComponent) child: StepsComponent;

  data$: Observable<Dataset.DatasetState>;
  recipe$: Observable<Recipe.RecipeState>;
  steps$: Observable<Step[]>;
  displayRate$: Observable<DisplayRate>;
  itemPrecision$: Observable<number>;
  beltPrecision$: Observable<number>;
  factoryPrecision$: Observable<number>;

  constructor(private store: Store<State>) {}

  ngOnInit() {
    this.data$ = this.store.select(Dataset.datasetState);
    this.recipe$ = this.store.select(Recipe.recipeState);
    this.steps$ = this.store.select(Products.getSteps);
    this.displayRate$ = this.store.select(Settings.getDisplayRate);
    this.itemPrecision$ = this.store.select(Settings.getItemPrecision);
    this.beltPrecision$ = this.store.select(Settings.getBeltPrecision);
    this.factoryPrecision$ = this.store.select(Settings.getFactoryPrecision);
  }

  ignoreStep(value: RecipeId) {
    this.store.dispatch(new Recipe.IgnoreAction(value));
  }

  setBelt(data: [RecipeId, ItemId]) {
    this.store.dispatch(new Recipe.SetBeltAction(data));
  }

  setFactory(data: [RecipeId, ItemId]) {
    this.store.dispatch(new Recipe.SetFactoryAction(data));
  }

  setModules(data: [RecipeId, ItemId[]]) {
    this.store.dispatch(new Recipe.SetModulesAction(data));
  }

  setBeaconModule(data: [RecipeId, ItemId]) {
    this.store.dispatch(new Recipe.SetBeaconModuleAction(data));
  }

  setBeaconCount(data: [RecipeId, number]) {
    this.store.dispatch(new Recipe.SetBeaconCountAction(data));
  }

  resetStep(value: RecipeId) {
    this.store.dispatch(new Recipe.ResetAction(value));
  }
}