
## Este es el objetivo:

El objetivo de este sistema es obtener la data de un sistema ERP llamado profit (hay dos servidores del ERP 2k8 y 2k12) Hacer una petición (ya tengo el query) que me traerá las notas de entrega realizada en cierta fecha y luego utilizaremos la información obtenida, la mostraremos en una tabla, crearemos un body con ella y haremos una petición a un sistema de seguimiento de ruta llamado DispatchTrack el cual recibe con una cola de mensajeria por lo que la petición es asincrona y siempre debera devolvernos un id para rastrear la petición. Yo no hago DispatchTrack.

# aclaraciones
lo que se envia a dispatch es todo el conjunto de la tabla no un solo registro sino el conjunto resultante del query
                              
## Esta es la forma en la que escribiras codigo

- La lógica debe estar aislados en clases services
- Las peticiones y manejo de la bd debe estar centralizada igualmente en una capa de datos
- Debes documentar tu código
- Debemos usar lógica componentizada
- Usaremos TS por lo que debe evitarse lo más posible el uso de any al menos que el hecho de no utilizarlo esté entorpeciendo algo


## Objetivo y fases del desarrollo del sistema

Fase 1: Conexión a dos servidores de base de datos, trabajaremos sin ORM y los sistemas gestores de base de datos son SQL Server.


## REGLA IMPORTANTE

- Nunca asumas que vas a guardar información en profit 2k8 o 2k12 por tu cuenta. Si debes pedir autorización debes decir explicitamente que quieres guardar información en la base de datos de profit.
- Si vas a hacer un update un where o algun query de modificacion en caso de que no te lo de debes siempre recordar agregar un where

<!-- END:nextjs-agent-rules -->
