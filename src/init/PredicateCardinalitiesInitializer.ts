import {Initializer, ResourceStore} from "@solid/community-server";
import {PredicateCardinalitiesHandler} from "../PredicateCardinalitiesHandler";

export class PredicateCardinalitiesInitializer extends Initializer {
  private readonly handler: PredicateCardinalitiesHandler;
  private readonly baseUrl: string;
  private readonly store: ResourceStore;

  public constructor(handler: PredicateCardinalitiesHandler, baseUrl: string, store: ResourceStore) {
    super();
    this.handler = handler;
    this.baseUrl = baseUrl;
    this.store = store;
  }

  public async handle(): Promise<void> {
    console.log("PredicateCardinalitiesInitializer.handle");
    await this.handler.initialize(this.baseUrl, this.store);
  }
}
