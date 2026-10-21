# Prebuilt runtime R1

reviewer-launcher.cjs is the exact launcher in ipdos-business-prebuilt-r1.zip. It loads unchanged R2 compiled Nest modules from backend/dist/, serves static frontend/ files and forces its own data/simulation.sqlite path. Both listeners use loopback. It does not invoke an installer or compiler.

The ZIP retains separate compiled calculation and registry modules and their fingerprints. It includes backend production dependencies with their own license files, available frontend license notices, and a newly initialized SQLite source with zero plans, reviews, orders and confirmation keys. It includes neither Node.js nor the recording/test database.

The exact ZIP is a release asset, identified by size and SHA-256 in the main README and checksum asset. This launcher source alone is not the complete runtime package. No bit-for-bit reproducible ZIP build or validation on other operating systems is claimed.
