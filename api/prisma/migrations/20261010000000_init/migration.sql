-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monsters" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageFilename" TEXT NOT NULL,
    "medalFilename" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "monsters_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "monsters" ADD CONSTRAINT "monsters_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
