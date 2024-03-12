import express from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc",
        },
        include: {
            genres: true,
            languages: true
        }
    });
    res.json(movies);
});

app.post("/movies", async (req, res) => {
    
    //desestruturação
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    try{

        // case insensitive - se  abusca for feita por john wick ou John Wick ou JOHN WICK, o registro vai ser retornado nao consulta

        // case sensitive - se buscar por john wick e no banco estiver como John Wick, não vai ser retornado na consulta

        const movieWithSameTitle = await prisma.movie.findFirst({
            where: { title: { equals: title, mode: "insensitive"} }
        });

        if(movieWithSameTitle){
            return res.status(409).send({ message: "Já existe um filme cadastrado com esse título"});
        }

        await prisma.movie.create({
            data: {
                title,
                genre_id,
                language_id,
                oscar_count,
                release_date: new Date(release_date)
            }
        });
    }catch(error){
        return res.status(500).send({message: "Falha ao cadastrar um filme"});
    }

    res.status(201).send();
});


app.put("/movies/:id", async (req, res) => {
    // pegar o id do registro que vai ser atualizado
    // (convertendo para número)
    const id = Number(req.params.id);


    try{
        const movie = await prisma.movie.findUnique({
            where: {
                id
            }
        });

        if(!movie){
            return res.status(404).send({message: "Filme não encontrado."});
        }

        const data = { ...req.body };
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;
    
    
        // pegar os dados do filme que será atualzado e atualizá-lo no prisma
        //const movie = //(não vamos usar para nada, então não é necessário)
        await prisma.movie.update({
            where: {
                id
            },
            // e aqui será necessário covnerter de string para data-calendário
            data
        });
    }catch(error){
        return res.status(500).send({ message: "Falha ao atualizar o registro do filme."});
    }

    // retornar o status correto informadno que o filme foi atualizado
    res.status(200).send();
});

app.delete("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);

    try{
        const movie = await prisma.movie.findUnique({ where: {id}});

        if(!movie){
            return res.status(404).send({ message: "O filme não foi encontrado."});
        }

        await prisma.movie.delete({where: { id }});

    }catch(error){
        return res.status(500).send({ message: "Não foi possível remover o filme."});
    }
    
    res.status(200).send();
});

app.get("/movies/:genreName", async (req, res) => {
    // receber o nome do gênero pelos parâmetros da rota
    //console.log(req.params.genreName);
    
    // filtrar os filmes do banco pelo genêro
    
    try{
    
        const moviesFilteredByGenreName = await prisma.movie.findMany({
        
            include: {
                genres: true,
                languages: true
            },
        
            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: "insensitive"
                    }
                }
            }
        });

        // retornar os filmes filtrados na resposta da rota
        res.status(200).send(moviesFilteredByGenreName);

    }catch(error){
        // return  (como está caindo no catch  e não está fazendo mais nada depois, não precisa do return
        res.status(500).send({ message: "Falha ao filtrar filmes por gênero."});
    }
});


app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
});

