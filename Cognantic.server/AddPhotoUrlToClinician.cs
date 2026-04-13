// C#
using Microsoft.EntityFrameworkCore.Migrations;

public partial class AddPhotoUrlToClinician : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PhotoUrl",
            table: "Clinician",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "PhotoUrl",
            table: "Clinician");
    }
}