Your didy on the page

si-didy now serves this exact file at 127.0.0.1:8791/world, so the character
panel's fetch is an ordinary same-origin request. A page on https cannot reach
http://127.0.0.1 - mixed content, plus private-network rules - and the fix is
emphatically not to relax that: a public page able to read your localhost would
be a worse thing than a missing panel.

One file, two homes. Served by si-didy it shows the real level, the ladder, the
gear actually worn and the gate numbers. Served publicly it says where the real
one lives, rather than spinning or showing a level nobody earned.

Fixes a panel that rendered a level with no ladder under it, because a missing
field threw mid-render - exactly the half-truth the panel exists to avoid. And
the rung labels said "needs someone else" from rung 5 up while the bound printed
underneath said 1-6 are self-administered. Both could not be true: a machine
agreeing with you is a real step past agreeing with yourself, and still well
short of a stranger. Three states now, not two.
