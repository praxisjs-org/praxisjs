import { StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Route } from "@praxisjs/router";
import { Link } from "@praxisjs/router";

@Route("/")
@Component()
export class Home extends StatelessComponent {
  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <h1>Welcome to My Blog</h1>
          <p>
            Built with <strong>PraxisJS</strong> — signal-driven, decorator-first,
            zero boilerplate.
          </p>
          <Link to="/blog" class="btn">Read the blog →</Link>
        </div>
      </div>
    );
  }
}
