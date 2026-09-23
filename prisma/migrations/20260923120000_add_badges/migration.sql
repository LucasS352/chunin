-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- Preserve every existing record and add the two badges already earned.
INSERT INTO "Badge" ("id", "emoji", "title", "description", "sortOrder", "updatedAt")
VALUES
    ('badge-star', '⭐', 'Estrela da Disciplina', 'Reconhecimento por dedicação e constância.', 10, CURRENT_TIMESTAMP),
    ('badge-computer', '💻', 'Ninja da Tecnologia', 'Evolução, curiosidade e habilidade no computador.', 20, CURRENT_TIMESTAMP);
