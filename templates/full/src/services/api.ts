import { Injectable } from "@praxisjs/di";

@Injectable()
export class ApiService {
  async fetchMessage(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return "Hello from ApiService!";
  }
}
